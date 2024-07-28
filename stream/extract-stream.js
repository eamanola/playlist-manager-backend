const { readFile, rm } = require('node:fs/promises');
const { exec } = require('node:child_process');
const { utils } = require('automata-utils');

const { outputPath } = require('./output-path');
const { codecOptions, extension, mime } = require('./format');

const { logger } = utils;

const extractStream = (type) => async (req, res, next) => {
  logger.info('extract');
  const { params } = req;

  const { path, streamIndex } = params;
  const TRANSCODE = false;

  const output = await outputPath(type, path, streamIndex, TRANSCODE, extension(type, TRANSCODE));

  const cmd = 'ffmpeg';
  const args = [
    '-y',
    '-i', `"${path}"`,
    '-map', `0:${streamIndex}`,
    ...codecOptions(type, TRANSCODE).split(' '),
    `"${output}"`,
  ];
  logger.info([cmd, ...args].join(' '));

  exec([cmd, ...args].join(' '), async (err) => {
    if (err) {
      rm(output);
      next(err);
    } else {
      res.setHeader('content-type', mime(type, TRANSCODE));
      res.status(200).send(await readFile(output));
      res.end();
    }
  });
};

module.exports = extractStream;
