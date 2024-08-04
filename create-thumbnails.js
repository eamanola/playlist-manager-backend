const { mkdir } = require('node:fs/promises');
const { join } = require('node:path');
const { array, string, object } = require('yup');
const { errors, utils } = require('automata-utils');

const canAccess = require('./utils/can-access');
const exists = require('./utils/exists');
const thumbnail = require('./cli/thumbnail');
const probe = require('./cli/probe');
const { THUMB_DIR } = require('./config');

const { accessDenied, createParamError } = errors;
const { logger } = utils;

const cachePath = (cacheId) => join(THUMB_DIR, `${cacheId}.jpg`);

const createThumbnail = async (cacheId, path) => {
  const output = cachePath(cacheId);

  if (!(await exists(output))) {
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

const listSchema = array().of(
  object().shape({
    cacheId: string().required(),
    path: string().required(),
  }).noUnknown().strict(),
);

const generateThumbnails = async (list) => {
  await mkdir(THUMB_DIR, { recursive: true });

  try {
    await listSchema.validate(list);
  } catch (err) {
    throw createParamError(err);
  }

  await Promise.all((list || []).map(({ cacheId, path }) => {
    if (path && !canAccess(path)) throw accessDenied;

    return createThumbnail(cacheId, path);
  }));

  return { message: 'ok' };
};

const createThumbnails = async (req, res, next) => {
  const { body } = req;

  try {
    res.status(200).json(await generateThumbnails(body));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  cachePath,
  generateThumbnails,
  router: createThumbnails,
};
