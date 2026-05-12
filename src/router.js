const express = require('express');
const { middlewares } = require('automata-utils');

const { THUMB_DIR } = require('./config');
const errors = require('./errors');
const { router: audio } = require('./stream/audio');
const { router: createThumbnails } = require('./create-thumbnails');
const { router: fonts } = require('./stream/fonts');
const { router: probes } = require('./probes');
const { router: play } = require('./play');
const { router: played } = require('./played');
const { router: subtitle } = require('./stream/subtitle');
const { router: video } = require('./stream/video');
const { router: videos } = require('./videos');

const { errorHandler } = middlewares;

const router = ({ db }) => {
  const expressRouter = express.Router();
  expressRouter.post('/create-thumbnails', createThumbnails);
  expressRouter.use('/fonts', fonts);
  expressRouter.post('/probes', probes);
  // /play{/:id} || /play/:id?
  expressRouter.put(['/play', '/play/:id'], play);
  expressRouter.use('/played', played({ db }));
  expressRouter.use('/thumbnails', express.static(THUMB_DIR));

  const ENABLE_STREAM = true;
  if (ENABLE_STREAM) {
    expressRouter.use('/audio', audio);
    expressRouter.use('/subtitle', subtitle);
    expressRouter.use('/video', video);
  }
  expressRouter.get('/videos', videos);

  expressRouter.use(errorHandler(errors, { defaultTo500: false }));

  return expressRouter;
};

module.exports = router;
