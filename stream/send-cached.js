const { createReadStream } = require('node:fs');

const { utils } = require('automata-utils');

const exists = require('../utils/exists');
const { outputPath } = require('./output-path');
const { copy, transcode: transcodeOptions, mimeToExt } = require('./format');

const { logger } = utils;

const sendCached = (type) => async (req, res, next) => {
  const { params } = req;

  const { path, streamIndex, transcode } = params;

  const TRANSCODE = !!transcode;

  const { mime } = TRANSCODE
    ? transcodeOptions(type)
    : (await copy(type, path, Number(streamIndex)));
  const extension = mimeToExt(mime);

  const output = await outputPath(type, path, streamIndex, TRANSCODE, extension);

  if (await exists(output)) {
    logger.info('-- send cached');

    res.setHeader('content-type', mime);
    res.status(200);
    createReadStream(output).pipe(res);
  } else {
    next();
  }
};

module.exports = sendCached;
