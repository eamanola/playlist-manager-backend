const needsTranscode = (type) => (err, req, res, next) => {
  if (err?.status === 415) {
    console.log(err);

    const requestedUrl = `${req.protocol}://${req.get('Host')}${req.originalUrl}`;
    res.setHeader('Location', `${requestedUrl}/transcode`);
    res.setHeader('content-type', `${type}/*`);

    // res.status(303);
    // res.send('See Other');

    res.status(307);
    res.send('Temporary Redirect');
    return;
  }

  next(err);
};

module.exports = needsTranscode;
