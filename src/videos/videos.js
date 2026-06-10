const { MEDIA_LIBS } = require('../config');
const findFiles = require('../cli/finder');
const { createNotFound } = require('../errors');
const cache = require('../temp-cache');
const formatVideos = require('./format-videos');

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

const getVideos = async () => {
  try {
    const files = await getFiles();

    // refresh
    cache.set(files);

    const formatted = formatVideos(files);

    return formatted;
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

module.exports = router;
