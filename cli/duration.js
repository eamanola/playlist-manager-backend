const exec = require('./exec-promisified.js');
const escapePath = require('../utils/escape-path.js');

const duration = async (filePath) => {
  const cmd = `ffprobe -v error -show_entries format=duration -of json "${escapePath(filePath)}"`;
  const { stdout } = await exec(cmd);
  return Number(JSON.parse(stdout).format.duration);
};

module.exports = duration;
