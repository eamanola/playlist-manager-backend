const { readFile } = require('node:fs/promises');

const { utils } = require('automata-utils');

const exists = require('../utils/exists');
const { outputPath } = require('./output-path');
const { copy, transcode: transcodeOptions } = require('./format');

const { logger } = utils;

const sendCached = (type) => async (req, res, next) => {
  const { params } = req;

  const { path, streamIndex, transcode } = params;

  const TRANSCODE = !!transcode;

  const { extension, mime } = TRANSCODE
    ? transcodeOptions(type)
    : (await copy(type, path, Number(streamIndex)));

  const output = await outputPath(type, path, streamIndex, TRANSCODE, extension);

  if (await exists(output)) {
    logger.info('-- send cached');

    res.setHeader('content-type', mime);
    res.status(200).send(await readFile(output));
    res.end();
  } else {
    next();
  }
};

module.exports = sendCached;
