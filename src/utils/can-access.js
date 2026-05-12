const { MEDIA_LIBS } = require('../config');

const canAccess = (path) => MEDIA_LIBS.some((mediaLib) => path.startsWith(mediaLib));

module.exports = canAccess;
