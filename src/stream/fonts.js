const { join } = require('node:path');
const { createReadStream, statSync } = require('node:fs');

const express = require('express');
const { utils } = require('automata-utils');

const exec = require('../cli/exec-promisified');
const exists = require('../utils/exists');
const escapePath = require('../utils/escape-path');
const { outputDir } = require('./output-path');
const checkAccess = require('./check-access');
const { CACHE_DIR } = require('../config');
const cache = require('../temp-cache');

const { logger } = utils;

const dumpFonts = async (id, filename) => {
  const dstDir = await outputDir('fonts', id);
  const output = join(dstDir, filename);
  const path = cache.getPath(id);
  const cmd = `ffmpeg -dump_attachment:t "" -n -i "${escapePath(path)}"`;

  try {
    logger.info('dumping fonts', id);
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

const router = () => {
  const expressRouter = express.Router();

  expressRouter.use('/:id/*fonts', checkAccess);

  expressRouter.use(express.static(`${CACHE_DIR}/media`, {
    fallthrough: false,
    immutable: true,
    maxAge: '1d',
    // setHeaders: (res, path, stat) => { console.log(path, stat); },
  }));

  // expressRouter.use('/:id/fonts/:filename', (err, req, res, next) => {
  //   console.warn('font error', err.status, err.path, err);
  //   const { params } = req;
  //   const { id, filename } = params;
  //   console.log(id, filename);
  //   next(err);
  // });

  expressRouter.use('/:id/fonts/:filename', async (error, req, res, next) => {
    if (error?.status !== 404) {
      next(error);
      return;
    }

    const { params } = req;
    const { id, filename } = params;

    try {
      const output = await dumpFonts(id, filename);

      if (req.method === 'GET') {
        res.status(200);
        createReadStream(output).pipe(res);
      } else if (req.method === 'HEAD') {
        const { size } = statSync(output);
        res.setHeader('content-type', 'font/*');
        res.setHeader('content-length', size);

        res.status(200);
        res.send(null);
      } else {
        res.status(400);
        res.send('Only GET and HEAD allowed');
      }
    } catch (err) {
      logger.warn(err);

      res.status(404);
      res.send('Not Found');
    }
  });

  return expressRouter;
};

module.exports = { router };
