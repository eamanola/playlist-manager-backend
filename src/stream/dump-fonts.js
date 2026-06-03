const { join } = require('node:path');

const { utils } = require('automata-utils');

const exec = require('../cli/exec-promisified');
const exists = require('../utils/exists');
const escapePath = require('../utils/escape-path');
const { outputDir } = require('./output-path');
const cache = require('../temp-cache');

const { logger } = utils;

const dumpFonts = async (id, filename) => {
  logger.info('-- dumping fonts', id);

  const dstDir = await outputDir('fonts', id);
  const output = join(dstDir, filename);
  const path = cache.getPath(id);
  const cmd = `ffmpeg -dump_attachment:t "" -n -i "${escapePath(path)}"`;

  try {
    logger.info(cmd);
    // this successfully fails
    await exec(cmd, { cwd: dstDir });
  } catch (err) {
    if (await exists(output) !== true) {
      logger.warn(err);
      throw err;
    }
  }

  return output;
};

module.exports = dumpFonts;
