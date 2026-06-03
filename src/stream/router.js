const express = require('express');

const transcodeStream = require('./transcode-stream');
const {
  checkAccess,
  checkType,
  dumpFonts,
  extractStream,
  needsTranscode,
  serveStatic,
} = require('./middlewares');

const createRouter = () => {
  const router = express.Router();

  // check valid enum for type
  router.use('{/transcode}/:id/:type', checkType());

  // access control (placeholder)
  router.use('{/transcode}/:id', checkAccess());

  // transcode stream
  router.get('/transcode/:id/:type/:streamIndex', transcodeStream());

  // send processed
  router.use(serveStatic());

  // 404: font error handling
  router.use('/:id/fonts/:filename', dumpFonts());

  // 404: video, audio, subtitle error handling
  router.use('/:id/:type/:streamIndex', extractStream());

  // codec known to fail
  // 415: thrown by formats
  // browser cant handle original codec, redirect to transcode
  router.use('/:id/:type/:streamIndex', needsTranscode());

  return router;
};

module.exports = createRouter;
