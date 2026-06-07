const transcode = require('../transcode');
const { mime } = require('../format');

module.exports = () => (req, res, next) => {
  const { params } = req;
  const { id, type, streamIndex } = params;

  try {
    const mediaStream = { id, streamIndex: Number(streamIndex), type };
    const { format } = transcode(mediaStream, res);

    res.status(200);
    res.setHeader('content-type', mime(type, format));
    res.setHeader('transfer-encoding', 'chunked');

    const date = new Date();
    res.setHeader(
      'expires',
      new Date(date.getFullYear(), date.getMonth(), date.getDay(), date.getHours() + 5).toString(),
    );
  } catch (err) {
    next(err);
  }
};
