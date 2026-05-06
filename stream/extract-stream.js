const { rm } = require('node:fs/promises');
const { exec } = require('node:child_process');
const { utils } = require('automata-utils');
const { createReadStream } = require('node:fs');

const escapePath = require('../utils/escape-path');

const { cachePath } = require('./output-path');
const { copy } = require('./format');

const { logger } = utils;

const extractStream = (type) => async (req, res, next) => {
  logger.info('-- extract');
  const { params } = req;

  const { path, streamIndex } = params;

  const { codecOptions, mime } = await copy(type, path, Number(streamIndex));

  const output = await cachePath(type, path, streamIndex);

  const cmd = 'ffmpeg';
  const args = [
    '-y',
    '-i',
    `"${escapePath(path)}"`,
    '-map',
    `0:${streamIndex}`,
    ...codecOptions.split(' '),
    `"${escapePath(output)}"`,
  ];
  logger.info('-', [cmd, ...args].join(' '));

  exec([cmd, ...args].join(' '), async (err) => {
    if (err) {
      rm(output);
      next(err);
      return;
    }

    res.setHeader('content-type', mime);
    res.status(200);
    createReadStream(output).pipe(res);
  });
};

module.exports = extractStream;
