const notFound = {
  message: 'Not Found',
  name: 'notFound',
  status: 404,
};

const createNotFound = ({ path }) => ({
  ...notFound,
  message: `${path} not found`,
});

module.exports = {
  createNotFound,
  notFound,
};
