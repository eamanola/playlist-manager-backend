const { join, basename } = require('node:path');

const mediaInfoParser = require('media-filename-parser');

const { MEDIA_LIBS } = require('../config');
const cache = require('../temp-cache');

const addIds = (videos) => videos.map(({ name, path, ...rest }) => ({
  ...rest,
  id: cache.getId(join(path, name)),
  name,
  path,
}));

const addMediaInfo = (videos, index) => videos.map(({ name, path, ...rest }) => {
  const subpath = join(path, name).replace(new RegExp(`^${MEDIA_LIBS[index]}/`, 'u'), '');
  const season = mediaInfoParser.season(subpath);
  const title = mediaInfoParser.title(subpath);
  const year = mediaInfoParser.year(subpath);
  const episode = mediaInfoParser.episode(subpath);

  return {
    ...rest,
    name,
    path,
    season,
    title,
    year,
    ...episode,
  };
});

const addFilename = (videos) => videos.map(({ name, ...rest }) => ({
  ...rest,
  filename: name,
  name,
}));

const removeNameAndPath = (videos) => videos.map(({ name, path, ...rest }) => ({
  ...rest,
}));

const toMediaLibs = (videos, index) => ({
  mediaLib: basename(MEDIA_LIBS[index]),
  videos,
});

const formatVideos = (files) => {
  const withIds = files.map(addIds);
  const withMediaInfo = withIds.map(addMediaInfo);
  const withFilename = withMediaInfo.map(addFilename);

  const withoutNameAndPath = withFilename.map(removeNameAndPath);

  const mediaLibs = withoutNameAndPath.map(toMediaLibs);

  // const util = require('node:util');
  // console.log(util.inspect(mediaLibs, { colors: true, depth: null, showHidden: false }));
  return mediaLibs;
};

module.exports = formatVideos;
