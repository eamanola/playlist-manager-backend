const { errors } = require('automata-utils');

const canAccess = require('../utils/can-access');

const { accessDenied } = errors;

const checkAccess = (req, res, next) => {
  const { params } = req;

  const { path } = params;

  let error = null;

  if (!canAccess(decodeURIComponent(path))) {
    error = accessDenied;
  }

  next(error);
};

module.exports = checkAccess;
