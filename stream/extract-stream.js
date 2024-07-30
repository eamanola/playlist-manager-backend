const { readFile, rm } = require('node:fs/promises');
const { exec } = require('node:child_process');
const { utils } = require('automata-utils');

const { outputPath } = require('./output-path');
const { copy } = require('./format');

const { logger } = utils;

const extractStream = (type) => async (req, res, next) => {
  logger.info('-- extract');
  const { params } = req;

  const { path, streamIndex } = params;
  const TRANSCODE = false;

  const { codecOptions, extension, mime } = await copy(type, path, Number(streamIndex));

  const output = await outputPath(type, path, streamIndex, TRANSCODE, extension);

  const cmd = 'ffmpeg';
  const args = [
    '-y',
    '-i', `"${path}"`,
    '-map', `0:${streamIndex}`,
    ...codecOptions.split(' '),
    `"${output}"`,
  ];
  logger.info('-', [cmd, ...args].join(' '));

  exec([cmd, ...args].join(' '), async (err) => {
    if (err) {
      rm(output);
      next(err);
    } else {
      res.setHeader('content-type', mime);
      res.status(200).send(await readFile(output));
      res.end();
    }
  });
};

module.exports = extractStream;
