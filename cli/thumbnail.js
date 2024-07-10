const exec = require('./exec-promisified.js');
const escapePath = require('../utils/escape-path.js');

// https://ffmpeg.org/ffmpeg-filters.html#Examples-115
// ffmpeg \
// -ss 00:00:01.00 \
// -i input.mp4 \
// -vf 'scale=320:320:force_original_aspect_ratio=decrease' \
// -vframes 1 \
// output.jpg

const thumbnail = async (input, output) => {
  const cmd = [
    'ffmpeg',
    '-ss 00:04:00.00',
    `-i "${escapePath(input)}"`,
    '-vf "scale=240:-1:force_original_aspect_ratio=decrease"',
    '-vframes 1',
    `"${output}"`,
  ].join(' ');

  return exec(cmd);
};

module.exports = thumbnail;
