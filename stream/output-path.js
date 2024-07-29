const { mkdir } = require('node:fs/promises');
const { sep } = require('node:path');

const { CACHE_DIR } = require('../config');

const outputDir = async (type, path) => {
  const sepReplaced = path.split(sep).filter((segment) => !!segment).join('-');

  const tempDir = `${CACHE_DIR}/media/${sepReplaced}/${type}`;
  await mkdir(tempDir, { recursive: true });

  return tempDir;
};

const outputPath = async (type, path, streamIndex, transcode, extension) => {
  const output = [
    await outputDir(type, path),
    `${streamIndex}${transcode ? 'tr' : ''}.${extension}`,
  ].join(sep);

  return output;
};

module.exports = {
  outputDir,
  outputPath,
};
