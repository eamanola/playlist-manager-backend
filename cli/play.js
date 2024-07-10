const { NODE_ENV, PLAYER } = require('../config');
const exec = require('./exec-promisified');

const play = async (filePath) => {
  const cmd = `${PLAYER} "${filePath}"`;

  const { stdout } = await exec(cmd);
  return stdout;
};

module.exports = play;

if (NODE_ENV === 'test') {
  module.exports.player = PLAYER;
}
