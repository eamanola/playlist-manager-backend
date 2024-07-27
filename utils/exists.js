const { access, constants } = require('node:fs/promises');

const exists = async (path) => {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch (err) {
    return false;
  }
};

module.exports = exists;
