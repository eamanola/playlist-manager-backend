const { mkdir } = require('node:fs/promises');
const { join } = require('node:path');

const { CACHE_DIR } = require('../config');

const outputDir = async (id, type) => {
  const tempDir = join(CACHE_DIR, 'media', id, type);
  await mkdir(tempDir, { recursive: true });

  return tempDir;
};

const cacheFilePath = async (id, type, streamIndex) => (
  join(await outputDir(id, type), `${streamIndex}`)
);

const tmpFilePath = async (id, type, streamIndex) => (
  `${await cacheFilePath(id, type, streamIndex)}.tmp`
);

module.exports = {
  cacheFilePath,
  outputDir,
  tmpFilePath,
};
