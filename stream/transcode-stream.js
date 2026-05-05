const { exec } = require('node:child_process');
const { rm, cp } = require('node:fs/promises');
const { createReadStream, watchFile, unwatchFile } = require('node:fs');
const kill = require('tree-kill');
const { utils } = require('automata-utils');

const { cachePath, tmpPath } = require('./output-path');
const { transcode } = require('./format');

const { logger } = utils;

const logProgress = ({ pid }) => (stderr) => {
  logger.info(pid, `${stderr}`);

  const match = `${stderr}`.match(/speed=\s*(?<speed>\d+?(?:\.\d+)?)x/u);
  if (match) {
    const { speed } = match.groups;

    if (Number(speed) < 1) {
      logger.warn(pid, 'slow transcode, consider lowering quality');
    }
  }
};

const sendTail = (proc, output, res) => new Promise((resolve, reject) => {
  logger.info(proc.pid, 'send tail');
  let sent = 0;

  const writeToRes = () => {
    logger.info(proc.pid, 'write', res.writableLength);

    const queueEmpty = res.writableLength === 0;
    if (queueEmpty) {
      const stream = createReadStream(output, { start: sent });

      stream.on('readable', () => {
        let chunk;
        // eslint-disable-next-line no-cond-assign
        while ((chunk = stream.read()) !== null) {
          res.write(chunk);
        }
      });

      stream.on('close', () => {
        sent += stream.bytesRead;
      });
    }
  };

  proc.on('close', (code, signal) => {
    logger.info(proc.pid, 'close', code, signal);

    unwatchFile(output);

    if (code === 0 && signal === null) {
      resolve(sent);
    } else {
      reject(new Error(`code: ${code}, signal: ${signal}`));
    }
  });

  watchFile(output, writeToRes);
});

const onConnectionClosed = (proc) => () => {
  logger.info(proc.pid, 'connection closed');

  if (proc.exitCode === null) {
    logger.info(proc.pid, 'killing');

    kill(proc.pid, 'SIGKILL');
  }
};

const postProcess = (mime, tmpFile, cacheFile) => {
  logger.info('post-process');

  if (mime === 'video/mp4') {
    logger.info('moving moov:');

    const cmd1 = 'ffmpeg';
    const args1 = [
      '-y', '-i', `"${tmpFile}"`, '-c:v', 'copy', '-f', 'mp4', `"${cacheFile}"`,
    ];
    logger.info('-', [cmd1, ...args1].join(' '));

    exec([cmd1, ...args1].join(' '), (moveErr) => logger.info(moveErr));
  } else {
    logger.info('copy to cache');

    cp(tmpFile, cacheFile);
  }
};

const transcodeStream = (type) => async (req, res, next) => {
  logger.info('-- transcode');

  const { params } = req;
  const { path, streamIndex } = params;

  const { codecOptions, mime } = transcode(type);

  const output = await tmpPath(type, path, streamIndex);

  const cmd = 'ffmpeg';
  const args = [
    '-y', '-v', 'error', '-stats',
    '-i', `"${path}"`,
    '-map', `0:${streamIndex}`,
    ...codecOptions.split(' '),
    `"${output}"`,
  ];
  logger.info('-', [cmd, ...args].join(' '));

  const proc = exec([cmd, ...args].join(' '), async (err) => {
    if (err) {
      rm(output);

      next(err);
      return;
    }

    postProcess(mime, output, await cachePath(type, path, streamIndex));
  });

  req.on('close', onConnectionClosed(proc));

  proc.stderr.on('data', logProgress(proc));

  proc.stderr.once('readable', async () => {
    res.setHeader('content-type', mime);

    try {
      const start = await sendTail(proc, output, res);

      logger.info(proc.pid, 'pipe rest');
      createReadStream(output, { start }).pipe(res);
    } catch (err) {
      logger.info(proc.pid, err);
    }
  });
};

module.exports = transcodeStream;
