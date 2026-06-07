const { mkdirSync } = require('node:fs');
const { join } = require('node:path');

const { CACHE_DIR } = require('../config');

const outputDir = (id, type) => {
  const tempDir = join(CACHE_DIR, 'media', id, type);
  mkdirSync(tempDir, { recursive: true });

  return tempDir;
};

const cacheFilePath = ({ id, type, streamIndex }) => join(outputDir(id, type), `${streamIndex}`);

const tmpFilePath = (mediaStream) => `${cacheFilePath(mediaStream)}.tmp`;

module.exports = {
  cacheFilePath,
  outputDir,
  tmpFilePath,
};
