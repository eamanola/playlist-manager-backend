const express = require('express');
const { middlewares } = require('automata-utils');

const { THUMB_DIR } = require('./config');
const errors = require('./errors');

const { router: createThumbnails } = require('./create-thumbnails');
const { router: probes } = require('./probes');
const { router: play } = require('./play');
const { router: played } = require('./played');
const { router: videos } = require('./videos');
// const { router: transcode } = require('./transcode');

const { errorHandler } = middlewares;

const router = express.Router();
router.post('/create-thumbnails', createThumbnails);
router.get('/probes', probes);
router.put('/play/:id?', play);
router.use('/played', played);
router.use('/thumbnails', express.static(THUMB_DIR));
router.get('/videos', videos);
// router.use('/transcode', transcode);

router.use(errorHandler(errors, { defaultTo500: false }));

module.exports = router;
