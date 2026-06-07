const { createReadStream } = require('node:fs');

const { utils } = require('automata-utils');

const transcode = require('../transcode');
const { mime } = require('../format');

const { logger } = utils;

const writeEncoded = (encoded, res) => new Promise((resolve) => {
  const encodedReader = createReadStream(encoded);

  encodedReader.on('end', () => {
    resolve(true);
  });

  encodedReader.pipe(res, { end: false });
});

module.exports = () => async (req, res, next) => {
  const { params } = req;
  const { id, type, streamIndex } = params;

  try {
    const mediaStream = { id, streamIndex: Number(streamIndex), type };
    const { format, encoded, encoder } = transcode(mediaStream, res);

    res.on('close', () => {
      logger.info('connection closed');
      logger.info('unpipe from encoder');
      encoder.stdout.unpipe(res);

      // TBD:
      // - finish transcode, and send cache next time
      // - pause transcode, and repipe if needed
      encoder.stdout.resume();
    });

    res.status(200);
    res.setHeader('content-type', mime(type, format));
    res.setHeader('transfer-encoding', 'chunked');

    // ? always true
    const isPaused = encoder.stdout.isPaused();
    if (!isPaused) {
      logger.info('---- pausing encoder');
      encoder.stdout.pause();
    }

    if (encoded !== null) {
      logger.info('---- writing encoded');
      await writeEncoded(encoded, res);
      logger.info('---- encoded written');
    }

    encoder.stdout.pipe(res);

    if (!isPaused) {
      logger.info('---- resuming encoded');
      encoder.stdout.resume();
    }
  } catch (err) {
    next(err);
  }
};
