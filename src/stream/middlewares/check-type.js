const { utils } = require('automata-utils');

const { logger } = utils;

module.exports = () => (req, res, next) => {
  const { params } = req;
  const { type } = params;

  if (![
    'audio',
    'fonts',
    'subtitle',
    'video',
  ].includes(type)) {
    logger.warn('access denied', type);
    res.status(400);
    res.send(null);
    return;
  }

  next();
};
