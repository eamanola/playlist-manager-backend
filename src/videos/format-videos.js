const { join, basename } = require('node:path');

const { MEDIA_LIBS } = require('../config');
const cache = require('../temp-cache');

const addIds = (videos) => videos.map(({ name, path, ...rest }) => ({
  ...rest,
  id: cache.getId(join(path, name)),
  name,
  path,
}));

const adjustPath = (videos, index) => videos.map(({ name, path, ...rest }) => ({
  ...rest,
  path: join(path.replace(new RegExp(`^${MEDIA_LIBS[index]}`, 'u'), ''), name)
    .replace(/^\//u, ''),
}));

const toMediaLibs = (videos, index) => ({
  mediaLib: basename(MEDIA_LIBS[index]),
  videos,
});

const formatVideos = (files) => {
  // const util = require('node:util');
  let formatted = files.map(addIds);
  formatted = formatted.map(adjustPath);
  formatted = formatted.map(toMediaLibs);

  // console.log(util.inspect(formatted, { colors: true, depth: null, showHidden: false }));
  return formatted;
};

module.exports = formatVideos;
