const { exec } = require('node:child_process');
const { rm } = require('node:fs/promises');
const { createReadStream } = require('node:fs');
const kill = require('tree-kill');
const { utils } = require('automata-utils');

const { outputPath } = require('./output-path');
const { transcode } = require('./format');

const { logger } = utils;

const logProgress = (pid, sent, stderr) => {
  logger.info(pid, sent, `${stderr}`);

  const match = `${stderr}`.match(/speed=\s*(?<speed>\d+?(?:\.\d+)?)x/u);
  if (match) {
    const { speed } = match.groups;

    if (Number(speed) < 1 && sent > 100) {
      logger.warn(pid, 'slow transcode, consider lowering quality');
    }
  }
};

const sendOutput = (proc, output, res) => {
  let start = 0;
  // progress goes to err by default
  proc.stderr.on('data', async (stderr) => {
    // progress prints start look
    // audio: size=   22190kB time=00:23:40.05 bitrate= 128.0kbits/s speed=  79x
    // video: frame=33812 fps=432 q=19.0 Lsize=  343867kB time=00:23:39.93 bitrate=1983.9kbits/s \
    // dup=0 drop=235 speed=18.2x

    // console.log(`${stderr}`);
    // TODO: something smarter here
    const isProgress = /\stime=/u.test(stderr) && /\sspeed=/u.test(stderr);
    if (isProgress) {
      const stream = createReadStream(output, { start });
      // eslint-disable-next-line no-restricted-syntax
      for await (const data of stream) {
        res.write(data);
      }
      stream.close();

      start += stream.bytesRead;

      logProgress(proc.pid, start, stderr);
    } else {
      logger.info(proc.pid, '---- trash:', `${stderr}`);
    }
  });
};

const onEnd = (filepath, res, next) => async (err) => {
  logger.info('onEnd', 'error:', !!err);

  if (err) {
    rm(filepath); // dont cache

    next(err);
  } else {
    res.status(200).end();
  }
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
  const TRANSCODE = true;
  const { codecOptions, extension, mime } = transcode(type);
  const output = await outputPath(type, path, streamIndex, TRANSCODE, extension);

  const cmd = 'ffmpeg';
  const args = [
    '-y', '-v', 'error', '-stats',
    '-i', `"${path}"`,
    '-map', `0:${streamIndex}`,
    ...codecOptions.split(' '),
    `"${output}"`,
  ];
  logger.info('-', [cmd, ...args].join(' '));

  const proc = exec([cmd, ...args].join(' '), onEnd(output, res, next));
  logger.info(proc.pid, 'starting');

  req.on('close', onConnectionClosed(proc));

  res.setHeader('content-type', mime);

  sendOutput(proc, output, res);
};

module.exports = transcodeStream;
