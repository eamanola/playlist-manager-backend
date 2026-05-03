const { errors, utils } = require('automata-utils');

const canAccess = require('../utils/can-access');

const { accessDenied } = errors;

const { logger } = utils;

const checkAccess = (req, res, next) => {
  const { params } = req;

  const { path } = params;

  let error = null;

  logger.info('-- check access', decodeURIComponent(path));

  if (!canAccess(decodeURIComponent(path))) {
    error = accessDenied;
  }

  next(error);
};

module.exports = checkAccess;
