const { exec } = require('node:child_process');
const { createReadStream, watchFile, unwatchFile } = require('node:fs');

const { utils } = require('automata-utils');

const { logger } = utils;

const sendAvilable = (proc, output, res) => new Promise((resolve, reject) => {
  logger.info(proc.pid, 'send tail');
  let sent = 0;

  const writeToRes = () => {
    // logger.info(proc.pid, 'write', res.writableLength);

    const queueEmpty = res.writableLength === 0;
    if (queueEmpty) {
      const stream = createReadStream(output, { start: sent });

      stream.on('readable', () => {
        let chunk;
        // eslint-disable-next-line no-cond-assign
        while ((chunk = stream.read()) !== null) {
          res.write(chunk);
        }
      });

      stream.on('close', () => {
        sent += stream.bytesRead;
      });
    }
  };

  proc.on('close', (code, signal) => {
    logger.info(proc.pid, 'close', code, signal);

    unwatchFile(output);

    if (code === 0 && signal === null) {
      resolve(sent);
    } else {
      reject(new Error(`code: ${code}, signal: ${signal}`));
    }
  });

  watchFile(output, writeToRes);
});

const sendOutput = async (proc, output, res) => {
  try {
    const start = await sendAvilable(proc, output, res);

    logger.info(proc.pid, 'pipe rest');
    createReadStream(output, { start }).pipe(res);
  } catch (err) {
    logger.info(proc.pid, err);
  }
};

const streamOutput = (cmd, output, res, { onFail, onSuccess }) => {
  const proc = exec(cmd, async (err) => {
    if (err) {
      logger.info(proc.pid, 'fail');
      onFail(err);
      return;
    }

    logger.info(proc.pid, 'success');
    onSuccess();
  });

  proc.stderr.once('readable', async () => {
    sendOutput(proc, output, res);
  });

  return proc;
};

module.exports = streamOutput;
