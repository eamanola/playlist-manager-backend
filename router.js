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

const router = express.Router();
router.use('/audio', audio);
router.post('/create-thumbnails', createThumbnails);
router.use('/fonts', fonts);
router.get('/probes', probes);
router.put('/play/:id?', play);
router.use('/played', played);
router.use('/thumbnails', express.static(THUMB_DIR));
router.use('/subtitle', subtitle);
router.use('/video', video);
router.get('/videos', videos);

router.use(errorHandler(errors, { defaultTo500: false }));

module.exports = router;
