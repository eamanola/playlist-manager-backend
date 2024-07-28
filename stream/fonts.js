const express = require('express');
const { sep } = require('node:path');

const exec = require('../cli/exec-promisified');
const exists = require('../utils/exists');
const { outputDir } = require('./output-path');

const checkAccess = require('./check-access');

const dumpIfMissing = async (req, res, next) => {
  const { params } = req;
  const { path, filename } = params;

  const dstDir = await outputDir('fonts', decodeURIComponent(path));
  const font = [dstDir, filename].join(sep);

  if (!await exists(font)) {
    const cmd = `ffmpeg -dump_attachment:t "" -i "${decodeURIComponent(path)}"`;

    try {
      await exec(cmd, { cwd: dstDir });
    } catch (err) {
      // this successfully fails
      if (await exists(font) !== true) {
        throw err;
      }
    }
  }

  next();
};

const serve = async (req, res) => {
  const { params } = req;
  const { path } = params;

  const dstDir = await outputDir('fonts', decodeURIComponent(path));

  return express.static(dstDir)(req, res);
};

const router = express.Router();

router.use('/:path', checkAccess);
router.use('/:path/:filename', dumpIfMissing);
router.use('/:path', serve);

module.exports = { router };
