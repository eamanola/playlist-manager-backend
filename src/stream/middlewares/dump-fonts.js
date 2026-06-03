const { createReadStream, statSync } = require('node:fs');

const { utils } = require('automata-utils');

const dumpFonts = require('../dump-fonts');

const { logger } = utils;

module.exports = () => async (error, req, res, next) => {
  if (error?.status !== 404) {
    next(error);
    return;
  }

  const { params } = req;
  const { id, filename } = params;

  try {
    const output = await dumpFonts(id, filename);

    if (req.method === 'GET') {
      res.status(200);
      createReadStream(output).pipe(res);
    } else if (req.method === 'HEAD') {
      const { size } = statSync(output);
      res.setHeader('content-type', 'font/*');
      res.setHeader('content-length', size);

      res.status(200);
      res.send(null);
    } else {
      res.status(405);
      res.send('Method Not Allowed');
    }
  } catch (err) {
    logger.warn(err);

    res.status(404);
    res.send('Not Found');
  }
};
