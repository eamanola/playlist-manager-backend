const express = require('express');

const { CACHE_DIR } = require('../../config');

module.exports = () => express.static(`${CACHE_DIR}/media`, {
  fallthrough: false,
  immutable: true,
  maxAge: '1d',
  // setHeaders: (res, path, stat) => { console.log(path, stat); },
});

// router.use('/:id/:type/:filename', (err, req, res, next) => {
//   console.warn('static serve error', err.status, err.path, err);
//   const { params } = req;
//   const { id, filename } = params;
//   console.log(id, filename);
//   next(err);
// });
