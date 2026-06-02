const { mkdir } = require('node:fs/promises');
const { join } = require('node:path');

const { errors, utils } = require('automata-utils');

const canAccess = require('./utils/can-access');
const exists = require('./utils/exists');
const thumbnail = require('./cli/thumbnail');
const probe = require('./cli/probe');
const { THUMB_DIR } = require('./config');
const cache = require('./temp-cache');

const { accessDenied } = errors;
const { logger } = utils;

const cachePath = (id) => join(THUMB_DIR, `${id}.jpg`);

const createThumbnail = async (id, path) => {
  const output = cachePath(id);

  if (!await exists(output)) {
    // logger.info('create thumb', path);
    const input = path;
    try {
      await thumbnail(input, output);
    } catch {
      const { duration } = await probe(input);
      const ss = Math.floor(duration / 6);
      try {
        await thumbnail(input, output, { ss });
      } catch (err) {
        logger.error('Could not create thumb', input, err);
      }
    }
  }

  return output;
};

const generateThumbnails = async (list) => {
  await mkdir(THUMB_DIR, { recursive: true });

  await Promise.all((list || []).map((id) => {
    const path = cache.getPath(id);

    if (path && !canAccess(path)) throw accessDenied;

    return createThumbnail(id, path);
  }));

  return { message: 'ok' };
};

const createThumbnails = async (req, res, next) => {
  const { body } = req;

  try {
    res.status(200).json(await generateThumbnails(body));
    return true;
  } catch (err) {
    next(err);
    return false;
  }
};

module.exports = {
  cachePath,
  generateThumbnails,
  router: createThumbnails,
};
