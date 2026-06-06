const express = require('express');
const { middlewares, errors, utils } = require('automata-utils');

const { THUMB_DIR } = require('./config');
const appErrors = require('./errors');
const { router: createThumbnails } = require('./create-thumbnails');
const { router: probes } = require('./probes');
const { router: play } = require('./play');
const { router: played } = require('./played');
const { router: videos } = require('./videos');
const { router: stream } = require('./stream');

const { errorHandler } = middlewares;
const { logger } = utils;

const router = ({ db }) => {
  const expressRouter = express.Router();
  expressRouter.post('/create-thumbnails', createThumbnails);
  expressRouter.post('/probes', probes);
  expressRouter.put(['/play', '/play/:id'], play);
  expressRouter.use('/played', played({ db }));
  expressRouter.use('/thumbnails', express.static(THUMB_DIR));
  expressRouter.get('/videos', videos);

  const ENABLE_STREAM = true;
  if (ENABLE_STREAM) {
    expressRouter.use('/stream', stream());
  }

  expressRouter.use((err, req, res, next) => {
    if (err) {
      logger.warn(err);
    }

    next(err);
  });

  expressRouter.use(errorHandler({ ...errors, ...appErrors }, { defaultTo500: false }));

  return expressRouter;
};

module.exports = router;
