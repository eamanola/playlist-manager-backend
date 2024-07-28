const { exec } = require('node:child_process');
const { rm } = require('node:fs/promises');
const { createReadStream } = require('node:fs');
const kill = require('tree-kill');
const { utils } = require('automata-utils');

const { outputPath } = require('./output-path');
const { codecOptions, extension, mime } = require('./format');

const { logger } = utils;

const transcodeStream = (type) => async (req, res, next) => {
  logger.info('transcode');
  const { params } = req;

  const { path, streamIndex } = params;
  const TRANSCODE = true;

  const output = await outputPath(type, path, streamIndex, TRANSCODE, extension(type, TRANSCODE));

  const cmd = 'ffmpeg';
  const args = [
    '-y', '-v', 'error', '-stats',
    '-i', `"${path}"`,
    '-map', `0:${streamIndex}`,
    ...codecOptions(type, TRANSCODE).split(' '),
    `"${output}"`,
  ];
  logger.info([cmd, ...args].join(' '));

  res.setHeader('content-type', mime(type, TRANSCODE));
  const proc = exec([cmd, ...args].join(' '), async (err) => {
    logger.info(proc.pid, 'ending', 'error:', !!err);
    if (err) {
      // dont cache
      rm(output);

      next(err);
    } else {
      res.status(200).end();
    }
  });

  logger.info(proc.pid, 'starting');

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

      logger.info(proc.pid, 'sent:', start);
    } else {
      logger.info(proc.pid, 'trash:', `${stderr}`);
    }
  });

  req.on('close', () => {
    if (proc.exitCode === null) {
      logger.info(proc.pid, 'connection closed, killing');
      kill(proc.pid, 'SIGKILL');
    }
  });
};

module.exports = transcodeStream;
