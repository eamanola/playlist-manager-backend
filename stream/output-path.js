const { mkdir } = require('node:fs/promises');
const { sep } = require('node:path');

const { CACHE_DIR } = require('../config');

const outputDir = async (type, path) => {
  const sepReplaced = path.split(sep).filter((segment) => !!segment).join('-');

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
