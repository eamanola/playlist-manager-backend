const { readFile } = require('node:fs/promises');

const { utils } = require('automata-utils');

const exists = require('../utils/exists');
const outputPath = require('./output-path');
const { extension, mime } = require('./format');

const { logger } = utils;

const sendCached = (type) => async (req, res, next) => {
  const { params } = req;

  const { path, streamIndex, transcode } = params;

  const TRANSCODE = !!transcode;

  const output = await outputPath(type, path, streamIndex, TRANSCODE, extension(type, TRANSCODE));

  if (await exists(output)) {
    logger.info('send cached');
    res.setHeader('content-type', mime(type, TRANSCODE));
    res.status(200).send(await readFile(output));
    res.end();
  } else {
    next();
  }
};

module.exports = sendCached;
