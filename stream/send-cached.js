const { createReadStream } = require('node:fs');

const { utils } = require('automata-utils');

const exists = require('../utils/exists');
const { cachePath } = require('./output-path');
const { mimeType } = require('./format');

const { logger } = utils;

const sendCached = (type) => async (req, res, next) => {
  const { params } = req;

  const { path, streamIndex } = params;

  const output = await cachePath(type, path, streamIndex);

  if (await exists(output)) {
    logger.info('-- send cached');

    res.setHeader('content-type', await mimeType(type, output));
    res.status(200);
    createReadStream(output).pipe(res);
  } else {
    next();
  }
};

module.exports = sendCached;
