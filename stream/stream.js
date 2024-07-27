const express = require('express');

const checkAccess = require('./check-access');
const sendCached = require('./send-cached');
const extractStream = require('./extract-stream');
const transcodeStream = require('./transcode-stream');

const createRouter = (type) => {
  const router = express.Router();
  router.use('/:path/:streamIndex/:transcode?', checkAccess);
  router.get('/:path/:streamIndex/:transcode?', sendCached(type));
  router.get('/:path/:streamIndex/transcode', transcodeStream(type));
  router.get('/:path/:streamIndex', extractStream(type));

  return router;
};

module.exports = createRouter;
