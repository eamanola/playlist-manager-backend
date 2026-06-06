const { mkdir } = require('node:fs/promises');
const { join } = require('node:path');

const { CACHE_DIR } = require('../config');

const outputDir = async (id, type, { transcode = false } = {}) => {
  const tempDir = join(CACHE_DIR, 'media', id, type, transcode ? 'transcode' : '');
  await mkdir(tempDir, { recursive: true });

  return tempDir;
};

const cacheFilePath = async (id, type, streamIndex, { transcode = false } = {}) => {
  const output = join(await outputDir(id, type, { transcode }), `${streamIndex}`);

  return output;
};

const tmpFilePath = async (id, type, streamIndex, { transcode = false } = {}) => (
  `${await cacheFilePath(id, type, streamIndex, { transcode })}.tmp`
);

module.exports = {
  cacheFilePath,
  outputDir,
  tmpFilePath,
};
