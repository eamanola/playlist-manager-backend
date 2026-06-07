const { utils } = require('automata-utils');

const { logger } = utils;

module.exports = () => (err, req, res, next) => {
  if (err?.status !== 415) {
    next(err);
    return;
  }

  const { params } = req;
  const { id, type, streamIndex } = params;

  logger.info(`-- forward ${type} to transcode: ${id}`);

  const serverUrl = `${req.protocol}://${req.get('Host')}`;
  res.setHeader('Location', `${serverUrl}/stream/transcode/${id}/${type}/${streamIndex}`);
  res.setHeader('content-type', `${type}/*`);

  // res.status(303);
  // res.send('See Other');

  res.status(307);
  res.send('Temporary Redirect');
};
