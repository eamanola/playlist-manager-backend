const crypto = require('node:crypto');
const { join } = require('node:path');

const { MEDIA_LIBS } = require('./config');
const findFiles = require('./cli/finder');

let cache;
const getId = (path) => cache.find(({ path: cachePath }) => path === cachePath)?.id;
const getPath = (id) => cache.find(({ id: cacheId }) => id === cacheId)?.path;

const getFiles = async () => {
  const files = await Promise.all(
    MEDIA_LIBS.map((mediaLib) => findFiles(mediaLib, {
      extentions: [
        'mp4',
        'mkv',
        'webm',
      ],
    })),
  );

  return files;
};

const set = (mediaLibs) => {
  cache = [
    ...mediaLibs
      .flat()
      .map(({ name, path }) => {
        const fullpath = join(path, name);
        const id = crypto.createHash('md5').update(fullpath).digest('hex');

        return { id, path: fullpath };
      }),
  ];
};

const init = async () => {
  set(await getFiles());
};

if (!cache) init();

module.exports = {
  all: () => [...cache],
  getId,
  getPath,
  init,
  set,
};
