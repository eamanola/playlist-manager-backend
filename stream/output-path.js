const { mkdir } = require('node:fs/promises');
const { sep } = require('node:path');

const { utils } = require('automata-utils');

const { CACHE_DIR } = require('../config');

const { logger } = utils;

const outputDir = async (type, path) => {
  let sepReplaced = path.split(sep).filter((segment) => !!segment).join('-');

  // Error: ENAMETOOLONG
  const MAX_LENTH = 100;
  if (sepReplaced.length > MAX_LENTH) {
    logger.warn(`cutting ${sepReplaced} to ${MAX_LENTH}`);

    sepReplaced = sepReplaced.substring(0, MAX_LENTH);
  }

  const tempDir = `${CACHE_DIR}/media/${sepReplaced}/${type}`;
  await mkdir(tempDir, { recursive: true });

  return tempDir;
};

const cachePath = async (type, path, streamIndex) => {
  const output = [await outputDir(type, path), `${streamIndex}`].join(sep);

  return output;
};

const tmpPath = async (type, path, streamIndex) => `${await cachePath(type, path, streamIndex)}.tmp`;

module.exports = {
  cachePath,
  outputDir,
  tmpPath,
};
