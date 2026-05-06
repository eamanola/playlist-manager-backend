const { exec } = require('node:child_process');
const { rm, cp } = require('node:fs/promises');
const { utils } = require('automata-utils');
const kill = require('tree-kill');

const { cachePath, tmpPath } = require('./output-path');
const { transcode } = require('./format');
const streamOutput = require('./stream-output');

const { logger } = utils;

const logProgress = ({ pid }) => (stderr) => {
  // logger.info(pid, `${stderr}`);
  process.stdout.write(`${pid}: ${stderr}`);

  const match = `${stderr}`.match(/speed=\s*(?<speed>\d+?(?:\.\d+)?)x/u);
  if (match) {
    const { speed } = match.groups;

    if (Number(speed) < 1) {
      logger.warn(pid, 'slow transcode, consider lowering quality');
    }
  }
};

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
      '-y',
      '-i',
      `"${tmpFile}"`,
      '-c:v',
      'copy',
      '-f',
      'mp4',
      `"${cacheFile}"`,
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
    '-y',
    '-v',
    'error',
    '-stats',
    '-i',
    `"${path}"`,
    '-map',
    `0:${streamIndex}`,
    ...codecOptions.split(' '),
    `"${output}"`,
  ];
  logger.info('-', [cmd, ...args].join(' '));

  const onSuccess = async () => {
    postProcess(
      mime,
      output,
      await cachePath(type, path, streamIndex),
    );
  };

  const onFail = (err) => {
    logger.info(/* proc.pid, */ 'removing output');
    rm(output);

    next(err);
  };

  res.setHeader('content-type', mime);

  const proc = streamOutput(
    [cmd, ...args].join(' '),
    output,
    res,
    { onFail, onSuccess },
  );

  req.on('close', onConnectionClosed(proc));

  proc.stderr.on('data', logProgress(proc));
};

module.exports = transcodeStream;
