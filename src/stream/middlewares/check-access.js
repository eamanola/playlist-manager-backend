const {
  errors,
  // utils,
} = require('automata-utils');

const canAccess = require('../../utils/can-access');
const cache = require('../../temp-cache');

const { accessDenied } = errors;

// const { logger } = utils;

const checkAccess = () => (req, res, next) => {
  const { params } = req;

  const { id } = params;
  const path = cache.getPath(id);

  // logger.info('-- check access', id);

  let error = null;

  if (!canAccess(path)) {
    error = accessDenied;
  }

  next(error);
};

module.exports = checkAccess;
