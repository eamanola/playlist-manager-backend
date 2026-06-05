const { rm } = require('node:fs/promises');

const { utils } = require('automata-utils');

const escapePath = require('../utils/escape-path');
const { cachePath } = require('./output-path');
const { copyOptions, streamProbe } = require('./format');
const exec = require('../cli/exec-promisified');
const cache = require('../temp-cache');

const { logger } = utils;

const extractStream = async (id, type, streamIndex) => {
  logger.info('-- extract', type, id);

  const path = cache.getPath(id);

  const { codec } = await streamProbe(path, streamIndex);
  const { format } = copyOptions(type, codec);

  const output = await cachePath(id, type, streamIndex);

  const cmd = 'ffmpeg';
  const args = [
    '-y',
    '-i',
    `"${escapePath(path)}"`,
    '-map_chapters',
    '-1',
    '-map_metadata',
    '-1',
    '-map',
    `0:${streamIndex}`,
    `-c:${type[0].toLowerCase()}`,
    'copy',
    '-f',
    format,
    `"${escapePath(output)}"`,
  ];

  try {
    const command = [cmd, ...args].join(' ');
    logger.info('---', command);
    await exec(command);
    return { format, output };
  } catch (err) {
    rm(output);
    throw err;
  }
};

module.exports = extractStream;
