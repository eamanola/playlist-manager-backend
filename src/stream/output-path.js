const { mkdir } = require('node:fs/promises');
const { join } = require('node:path');

const { CACHE_DIR } = require('../config');

const outputDir = async (id, type) => {
  const tempDir = join(CACHE_DIR, 'media', id, type);
  await mkdir(tempDir, { recursive: true });

  return tempDir;
};

const cachePath = async (id, type, streamIndex) => {
  const output = join(await outputDir(id, type), `${streamIndex}`);

  return output;
};

const tmpPath = async (id, type, streamIndex) => `${await cachePath(id, type, streamIndex)}.tmp`;

module.exports = {
  cachePath,
  outputDir,
  tmpPath,
};
