const notFound = {
  message: 'Not Found',
  name: 'notFound',
  status: 404,
};

const createNotFound = ({ path }) => ({
  ...notFound,
  message: `${path} not found`,
});

const notSupported = {
  message: 'Codec not supported by browser, please transcode',
  name: 'Unsupported Media Type',
  status: 415,
};

const createNotSupported = ({ codec }) => ({
  ...notSupported,
  message: `${codec} not supported by browser, please transcode`,
});

const methodNotAllowed = {
  message: 'Method Not Allowed',
  name: 'methodNotAllowed',
  status: 405,
};

module.exports = {
  createNotFound,
  createNotSupported,
  methodNotAllowed,
  notFound,
  notSupported,
};
