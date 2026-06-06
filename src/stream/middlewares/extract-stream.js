const { createReadStream } = require('node:fs');

const extractStream = require('../extract-stream');
const { mime } = require('../format');

module.exports = () => async (error, req, res, next) => {
  if (error?.status !== 404) {
    next(error);
    return;
  }

  const { params } = req;
  const { id, type, streamIndex } = params;

  if (![
    'audio',
    'subtitle',
    'video',
  ].includes(type)) {
    next(error);
    return;
  }

  try {
    const { format, output } = await extractStream(id, type, Number(streamIndex));

    res.setHeader('content-type', mime(type, format));

    createReadStream(output).pipe(res);
    res.status(200);
  } catch (err) {
    next(err);
  }
};
