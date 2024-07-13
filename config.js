const {
  MEDIA_LIBS = '/home/eamanola/Videos',
  NODE_ENV,
  PLAYER = 'open',
  THUMB_DIR = '/tmp/media-library/thumbnails',
} = process.env;

module.exports = {
  MEDIA_LIBS: MEDIA_LIBS ? MEDIA_LIBS.split(':') : [],
  NODE_ENV,
  PLAYER,
  THUMB_DIR,
};
