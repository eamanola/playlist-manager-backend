const { mkdir } = require('node:fs/promises');
const { join } = require('node:path');

const { CACHE_DIR } = require('../config');

const outputDir = async (type, id) => {
  const tempDir = join(CACHE_DIR, 'media', id, type);
  await mkdir(tempDir, { recursive: true });

  return tempDir;
};

const cachePath = async (type, id, streamIndex) => {
  const output = join(await outputDir(type, id), `${streamIndex}`);

  return output;
};

const tmpPath = async (type, id, streamIndex) => `${await cachePath(type, id, streamIndex)}.tmp`;

module.exports = {
  cachePath,
  outputDir,
  tmpPath,
};
