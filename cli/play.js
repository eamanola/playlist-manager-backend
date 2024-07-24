const { NODE_ENV, PLAYER } = require('../config');
const exec = require('./exec-promisified');
const escapePath = require('../utils/escape-path');

const play = async (filePath) => {
  const cmd = `${PLAYER} "${escapePath(filePath)}"`;

  const { stdout } = await exec(cmd);
  return stdout;
};

module.exports = play;

if (NODE_ENV === 'test') {
  module.exports.player = PLAYER;
}
