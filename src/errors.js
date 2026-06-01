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
  message: 'Codec not supported, please transcode',
  name: 'notSupported',
  status: 400,
};

const createNotSupported = ({ codec }) => ({
  ...notSupported,
  message: `${codec} not supported, please transcode`,
});

module.exports = {
  createNotFound,
  createNotSupported,
  notFound,
  notSupported,
};
