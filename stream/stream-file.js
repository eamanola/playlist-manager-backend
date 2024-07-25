const fs = require('node:fs');

const { utils } = require('automata-utils');

const { logger } = utils;

const sleep = (ms) => (new Promise((resolve) => { setTimeout(resolve, ms); }));

const streamFile = async (path, res, { sleepMS }) => {
  res.setHeader('Transfer-Encoding', 'chunked');

  let bytesRead = 0;

  do {
    const stream = fs.createReadStream(path, { start: bytesRead });
    // eslint-disable-next-line no-restricted-syntax, no-await-in-loop
    for await (const data of stream) {
      res.write(data);
    }
    stream.close();

    bytesRead += stream.bytesRead;

    // eslint-disable-next-line no-await-in-loop
    await sleep(sleepMS);

    logger.info('sent:', bytesRead, 'have:', fs.statSync(path).size);
  } while (bytesRead < fs.statSync(path).size);

  logger.info('done');
};

module.exports = streamFile;
