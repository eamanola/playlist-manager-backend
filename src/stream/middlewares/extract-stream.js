const { createReadStream } = require('node:fs');

const extractStream = require('../extract-stream');

module.exports = () => async (error, req, res, next) => {
  if (error?.status !== 404) {
    next(error);
    return;
  }

  const { params } = req;
  const { id, type, streamIndex } = params;

  try {
    const { mime, output } = await extractStream(id, type, Number(streamIndex));

    res.setHeader('content-type', mime);

    createReadStream(output).pipe(res);
    res.status(200);
  } catch (err) {
    next(err);
  }
};
