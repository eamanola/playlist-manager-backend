const { mkdir } = require('node:fs/promises');
const { sep } = require('node:path');

const { CACHE_DIR } = require('../config');

const outputPath = async (type, path, streamIndex, transcode, extension) => {
  const sepReplaced = path.split(sep).filter((segment) => !!segment).join('-');

  const tempDir = `${CACHE_DIR}/media/${sepReplaced}/${type}`;
  await mkdir(tempDir, { recursive: true });

  const output = `${tempDir}/${streamIndex}${transcode ? 'tr' : ''}.${extension}`;
  return output;
};

module.exports = outputPath;
