const { access, constants, mkdir } = require('node:fs/promises');
const { join } = require('node:path');
const { array, string, object } = require('yup');
const { errors, utils } = require('automata-utils');

const canAccess = require('./utils/can-access');
const thumbnail = require('./cli/thumbnail');
const { THUMB_DIR } = require('./config');

const { accessDenied, createParamError } = errors;
const { logger } = utils;

mkdir(THUMB_DIR, { recursive: true });

const exists = async (path) => {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch (err) {
    return false;
  }
};

const cachePath = (cacheId) => join(THUMB_DIR, `${cacheId}.jpg`);

const createThumbnail = async (cacheId, path) => {
  const output = cachePath(cacheId);

  if (!(await exists(output))) {
    // logger.info('create thumb', path);
    const input = path;
    await thumbnail(input, output);
  }
  // else {
  //   logger.info('skip create thumb', path);
  // }

  return output;
};

const listSchema = array().of(
  object().shape({
    cacheId: string().required(),
    path: string().required(),
  }).noUnknown().strict(),
);

const generateThumbnails = async (list) => {
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
