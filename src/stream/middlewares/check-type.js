const { errors } = require('automata-utils');

const { createParamError } = errors;

module.exports = () => (req, res, next) => {
  const { params } = req;
  const { type } = params;

  if (![
    'audio',
    'fonts',
    'subtitle',
    'video',
  ].includes(type)) {
    next(createParamError({
      message: `type must be one of audio, fonts, subtitle, or video, was: ${type}`,
    }));
    return;
  }

  next();
};
