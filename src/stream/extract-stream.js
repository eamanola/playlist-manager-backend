const { rm } = require('node:fs/promises');

const { utils } = require('automata-utils');

const escapePath = require('../utils/escape-path');
const { cachePath } = require('./output-path');
const { copyOptions } = require('./format');
const exec = require('../cli/exec-promisified');
const cache = require('../temp-cache');

const { logger } = utils;

const extractStream = async (id, type, streamIndex) => {
  logger.info('-- extract', type, id);

  const path = cache.getPath(id);

  const { codecOptions, mime } = await copyOptions(type, path, Number(streamIndex));

  const output = await cachePath(id, type, streamIndex);

  const cmd = 'ffmpeg';
  const args = [
    '-y',
    '-i',
    `"${escapePath(path)}"`,
    '-map_chapters -1 -map_metadata -1',
    '-map',
    `0:${streamIndex}`,
    ...codecOptions.split(' '),
    `"${escapePath(output)}"`,
  ];

  try {
    logger.info('-', [cmd, ...args].join(' '));
    await exec([cmd, ...args].join(' '));
    return { mime, output };
  } catch (err) {
    rm(output);
    throw err;
  }
};

module.exports = extractStream;
