const express = require('express');

const { CACHE_DIR } = require('../../config');
const { mime } = require('../format');

module.exports = () => express.static(`${CACHE_DIR}/media`, {
  fallthrough: false,
  immutable: true,
  maxAge: '1d',
  // set mime ? seem to work without
  setHeaders: (res, path/* , stat */) => {
    const type = path.split('/').reverse()[1];

    if ([
      'audio',
      // font has extension and handled by express.static
      // 'font',
      'subtitle',
      'video',
    ].includes(type)) {
      res.setHeader('content-type', mime(type, null));
    }
  },
});

// router.use('/:id/:type/:filename', (err, req, res, next) => {
//   console.warn('static serve error', err.status, err.path, err);
//   const { params } = req;
//   const { id, filename } = params;
//   console.log(id, filename);
//   next(err);
// });
