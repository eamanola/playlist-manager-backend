const { join } = require('node:path');

const { MEDIA_LIBS } = require('./config');
const findFiles = require('./cli/finder');
const { createNotFound } = require('./errors');

const getVideos = async () => {
  try {
    const allFiles = await Promise.all(MEDIA_LIBS.map(
      (mediaLib) => findFiles(mediaLib, { extentions: ['mp4', 'mkv', 'webm'] }),
    ));

    return allFiles.map((mediaLibFiles, index) => ({
      mediaLib: MEDIA_LIBS[index],
      videos: mediaLibFiles.map(({ name, path }) => join(path, name)),
    }));
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw createNotFound(err);
    }

    throw err;
  }
};

const videos = async (req, res, next) => {
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
  router: videos,
};
