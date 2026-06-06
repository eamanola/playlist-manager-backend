const express = require('express');

const {
  checkAccess,
  checkType,
  dumpFonts,
  extractStream,
  needsTranscode,
  serveStatic,
  transcode,
} = require('./middlewares');

const createRouter = () => {
  const router = express.Router();

  // check valid enum for type
  // one of audio, fonts, subtitle, video
  router.use('{/transcode}/:id/:type', checkType());

  // access control (placeholder)
  router.use('{/transcode}/:id', checkAccess());

  // transcode stream
  router.get('/transcode/:id/:type/:streamIndex', transcode());

  // send processed
  // throws 404
  router.use(serveStatic());

  // 404 handling: fonts
  router.use('/:id/fonts/:filename', dumpFonts());

  // 404 handling: video, audio, subtitle
  // throws 415
  router.use('/:id/:type/:streamIndex', extractStream());

  // 415 handling: redirect to transcode
  router.use('/:id/:type/:streamIndex', needsTranscode());

  return router;
};

module.exports = createRouter;
