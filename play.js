const { errors, utils } = require('automata-utils');

const canAccess = require('./utils/can-access');
const play = require('./cli/play');

const { logger } = utils;

const startPlay = (path) => {
  if (!canAccess(path)) {
    const { accessDenied } = errors;
    throw accessDenied;
  }

  return play(path);
};

const router = (req, res, next) => {
  const { body } = req;
  const { path } = body;

  logger.info(`play ${path}`);
  try {
    res.status(200).json(startPlay(path));
    return true;
  } catch (err) {
    next(err);
    return false;
  }
};

module.exports = { router };
