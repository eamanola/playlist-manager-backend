const { join } = require('node:path');
const crypto = require('node:crypto');
// const util = require('node:util');

const { MEDIA_LIBS } = require('./config');
const findFiles = require('./cli/finder');
const { createNotFound } = require('./errors');

// TODO: move to db
let cache = [];
const getId = (path) => cache.find(({ path: cachePath }) => path === cachePath)?.id;
// const getPath = (id) => cache.find(({ id: cacheId }) => id === cacheId)?.path;

const getFiles = async () => {
  try {
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
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw createNotFound(err);
    }

    throw err;
  }
};

const parseMediaInfo = async (videoFiles) => {
  const parser = await import('media-filename-parser');

  const parsedVideosFiles = videoFiles.map(({ mediaLib, videos }) => {
    const parsedVideos = videos.map(({ path, ...rest }) => {
      const subpath = path.replace(new RegExp(`^${mediaLib}/`, 'u'), '');
      const season = parser.season(subpath);
      const title = parser.title(subpath);
      const year = parser.year(subpath);
      const episode = parser.episode(subpath);

      return {
        path,
        ...rest,
        season,
        title,
        year,
        ...episode,
      };
    });

    return { mediaLib, videos: parsedVideos };
  });

  return parsedVideosFiles;
};

const addIds = ({ videos, ...rest1 }) => ({
  videos: videos.map(({ path, ...rest2 }) => ({
    id: getId(path),
    path,
    ...rest2,
  })),
  ...rest1,
});

const getVideos = async () => {
  try {
    const files = await getFiles();

    // TODO
    cache = files
      .flat()
      .map(({ name, path }) => {
        const fullpath = join(path, name);
        const id = crypto.createHash('md5').update(fullpath).digest('hex');

        return { id, path: fullpath };
      });

    const formatted = files.map((mediaLibFileList, index) => ({
      mediaLib: MEDIA_LIBS[index],
      videos: mediaLibFileList.map(({ name, path }) => ({
        filename: name, path: join(path, name),
      })),
    }));

    const withMediaInfo = await parseMediaInfo(formatted);

    const withId = withMediaInfo.map(addIds);

    // console.log(util.inspect(withId, {showHidden: false, depth: null, colors: true}));
    // console.log(util.inspect(videoFiles, {showHidden: false, depth: null, colors: true}));
    return withId;
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw createNotFound(err);
    }

    throw err;
  }
};

const router = async (req, res, next) => {
  try {
    res.status(200).json(await getVideos());
    return true;
  } catch (err) {
    next(err);
    return false;
  }
};

module.exports = {
  getVideos,
  router,
};
