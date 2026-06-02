const crypto = require('node:crypto');
const { join } = require('node:path');

let cache = [];
const getId = (path) => cache.find(({ path: cachePath }) => path === cachePath)?.id;
const getPath = (id) => cache.find(({ id: cacheId }) => id === cacheId)?.path;

const set = (files) => {
  cache = [
    ...files
      .flat()
      .map(({ name, path }) => {
        const fullpath = join(path, name);
        const id = crypto.createHash('md5').update(fullpath).digest('hex');

        return { id, path: fullpath };
      }),
  ];
};

module.exports = {
  getId,
  getPath,
  set,
};
