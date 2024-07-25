const {
  CACHE_DIR = '/tmp/media-library',
  MEDIA_LIBS = '/home/eamanola/Videos',
  NODE_ENV,
  PLAYER = 'open',
} = process.env;

module.exports = {
  CACHE_DIR,
  MEDIA_LIBS: MEDIA_LIBS ? MEDIA_LIBS.split(':') : [],
  NODE_ENV,
  PLAYER,
  THUMB_DIR: `${CACHE_DIR}/thumbnails`,
};
