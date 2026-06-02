const { join } = require('node:path');

const express = require('express');

const exec = require('../cli/exec-promisified');
const exists = require('../utils/exists');
const escapePath = require('../utils/escape-path');
const { outputDir } = require('./output-path');
const checkAccess = require('./check-access');
const cache = require('../temp-cache');

const dumpIfMissing = async (req, res, next) => {
  const { params } = req;
  const { id, filename } = params;

  const dstDir = await outputDir('fonts', id);
  const font = join(dstDir, filename);

  if (!await exists(font)) {
    const path = cache.getPath(id);
    const cmd = `ffmpeg -dump_attachment:t "" -i "${escapePath(path)}"`;

    try {
      // this successfully fails
      await exec(cmd, { cwd: dstDir });
    } catch (err) {
      if (await exists(font) !== true) {
        throw err;
      }
    }
  }

  next();
};

const serve = async (req, res) => {
  const { params } = req;
  const { id } = params;

  const dstDir = await outputDir('fonts', id);

  return express.static(dstDir)(req, res);
};

const router = express.Router();

router.use('/:id', checkAccess);
router.use('/:id/:filename', dumpIfMissing);
router.use('/:id', serve);

module.exports = { router };
