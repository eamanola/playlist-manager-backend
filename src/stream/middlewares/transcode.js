const transcodeStream = require('../transcode-stream');
const { mime } = require('../format');

module.exports = () => async (req, res, next) => {
  const { params } = req;
  const { id, type, streamIndex } = params;

  const onStart = ({ format }) => {
    // send out to browser
    res.status(200);
    res.setHeader('content-type', mime(type, format));
    res.setHeader('transfer-encoding', 'chunked');
    res.setHeader('connection', 'keep-alive');

    const date = new Date();
    res.setHeader(
      'expires',
      new Date(date.getFullYear(), date.getMonth(), date.getDay(), date.getHours() + 5).toString(),
    );
  };

  try {
    await transcodeStream(id, type, streamIndex, { onError: next, onStart, writeable: res });
  } catch (err) {
    console.log(err);
    next(err);
  }
};
