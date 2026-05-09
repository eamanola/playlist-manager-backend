const { mkdir } = require('node:fs/promises');
const { sep, join } = require('node:path');
const { createHash } = require('node:crypto');

const { CACHE_DIR } = require('../config');

const outputDir = async (type, path) => {
  const sepReplaced = path.split(sep).filter((segment) => !!segment).join('-');

  // Error: ENAMETOOLONG
  // names might be too long
  const hashed = createHash('md5').update(sepReplaced).digest('hex');

  const tempDir = join(CACHE_DIR, 'media', hashed, type);
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
