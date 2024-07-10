const { errors } = require('automata-utils');

const canAccess = require('./utils/can-access');

const play = require('./cli/play');

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

  try {
    res.status(200).json(startPlay(path));
  } catch (err) {
    next(err);
  }
};

module.exports = { router };
