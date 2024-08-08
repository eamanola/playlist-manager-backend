const { exec } = require('node:child_process');
const { rm, cp } = require('node:fs/promises');
const { createReadStream, watchFile, unwatchFile } = require('node:fs');
const kill = require('tree-kill');
const { utils } = require('automata-utils');

const { cachePath, tmpPath } = require('./output-path');
const { transcode } = require('./format');

const { logger } = utils;

const logProgress = (pid, stderr) => {
  logger.info(pid, `${stderr}`);

  const match = `${stderr}`.match(/speed=\s*(?<speed>\d+?(?:\.\d+)?)x/u);
  if (match) {
    const { speed } = match.groups;

    if (Number(speed) < 1) {
      logger.warn(pid, 'slow transcode, consider lowering quality');
    }
  }
};

const sendOutput = (proc, output, res) => {
  let sent = 0;

  const writeToRes = () => {
    console.log(proc.pid, 'write', res.writableLength);

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

  const pipeRest = () => {
    console.log(proc.pid, 'pipe rest');

    createReadStream(output, { start: sent }).pipe(res);
  };

  proc.on('close', (code, signal) => {
    console.log(proc.pid, 'close', code, signal);

    unwatchFile(output);

    if (code === 0 && signal === null) {
      pipeRest();
    }
  });

  watchFile(output, writeToRes);
};

const onConnectionClosed = (proc) => () => {
  logger.info(proc.pid, 'connection closed');

  if (proc.exitCode === null) {
    logger.info(proc.pid, 'killing');

    kill(proc.pid, 'SIGKILL');
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

  res.setHeader('content-type', mime);

  const proc = exec([cmd, ...args].join(' '), async (err) => {
    if (err) {
      logger.info(proc.pid, 'killing');

      rm(output);

      next(err);
    } else {
      const tmpFile = output;
      const cacheFile = await cachePath(type, path, streamIndex);
      console.info(proc.pid, 'post-process');
      if (mime === 'video/mp4') {
        const cmd1 = 'ffmpeg';
        const args1 = [
          '-y',
          '-i', `"${tmpFile}"`,
          '-c:v', 'copy',
          '-f', 'mp4',
          `"${cacheFile}"`,
        ];
        logger.info(proc.pid, 'moving moov:', [cmd1, ...args1].join(' '));
        exec([cmd1, ...args1].join(' '), (moveErr) => console.log(moveErr));
      } else {
        console.info(proc.pid, 'copy to cache');
        cp(tmpFile, cacheFile);
      }
    }
  });

  proc.stderr.on('data', (stderr) => {
    logProgress(proc.pid, stderr);
  });

  req.on('close', onConnectionClosed(proc, output));

  proc.stderr.once('readable', () => sendOutput(proc, output, res));
};

module.exports = transcodeStream;
