const express = require('express');

const checkAccess = require('./check-access');
const sendCached = require('./send-cached');
const extractStream = require('./extract-stream');
const transcodeStream = require('./transcode-stream');

const createRouter = (type) => {
  const router = express.Router();

  router.get('/:path/:streamIndex/transcode', checkAccess, transcodeStream(type));
  router.get('/:path/:streamIndex', checkAccess, sendCached(type));
  router.get('/:path/:streamIndex', checkAccess, extractStream(type));

  return router;
};

module.exports = createRouter;
