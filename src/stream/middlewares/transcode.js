const { utils } = require('automata-utils');
const kill = require('tree-kill');

const transcodeStream = require('../transcode-stream');
const { mime } = require('../format');

const { logger } = utils;

module.exports = () => async (req, res, next) => {
  const { params } = req;
  const { id, type, streamIndex } = params;

  let transcoder;
  const onStart = ({ format, proc }) => {
    transcoder = proc;

    // send out to browser
    res.status(200);
    res.setHeader('content-type', mime(type, format));
    res.setHeader('transfer-encoding', 'chunked');
    res.setHeader('connection', 'keep-alive');
    proc.stdout.pipe(res);
  };

  // clint closed connections
  req.on('close', () => {
    logger.info(transcoder.pid, 'connection closed');

    const HEAD_START = 0;
    setTimeout(() => {
      // User navigates away - end transcoding
      // TODO: client temporarily closes the connection.
      // is this necessary?
      logger.info(transcoder.pid, 'exitCode', transcoder.exitCode);
      if (transcoder.exitCode === null) {
        logger.info(transcoder.pid, 'killing transcoder');

        kill(transcoder.pid, 'SIGKILL');
      }
    }, HEAD_START);
  });

  try {
    await transcodeStream(id, type, streamIndex, { onError: next, onStart });
  } catch (err) {
    console.log(err);
    next(err);
  }
};
