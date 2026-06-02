const express = require('express');

const checkAccess = require('./check-access');
const sendCached = require('./send-cached');
const extractStream = require('./extract-stream');
const transcodeStream = require('./transcode-stream');
const needsTranscode = require('./needs-transcode');

const createRouter = (type) => {
  const router = express.Router();

  router.get(['/:id/*rest'], checkAccess);
  router.get('/:id/:streamIndex/transcode', transcodeStream(type));
  router.get('/:id/:streamIndex', sendCached(type));
  router.get('/:id/:streamIndex', extractStream(type));
  router.use(needsTranscode(type));

  return router;
};

module.exports = createRouter;
