const { mkdir } = require('node:fs/promises');

const streamFile = require('./stream-file');
const { CACHE_DIR } = require('../config');
const exec = require('../cli/exec-promisified');

const sleep = (ms) => (new Promise((resolve) => { setTimeout(resolve, ms); }));

const extractStream = async (input, streamIndex, codecOptions, output) => {
  const cmd = [
    'ffmpeg -y',
    `-i "${input}"`,
    `-map 0:${streamIndex}`,
    codecOptions || '-c copy',
    `"${output}"`,
  ].join(' ');

  console.log(cmd);
  return exec(cmd);
};
// const cmd = [
//   'ffmpeg',
//   '-i input',
//   '-map 0:v:0', // input_file_index:stream_type_specifier:stream_index (1st video stream)
//   '-map 0:a:1', // input_file_index:stream_type_specifier:stream_index (2nd audio stream)
//   '-c:v h264_nvenc -pix_fmt yuv420p -movflags frag_keyframe+empty_moov',
//   '-c:a aac',
//   // '-f mp4',
//   '-o out.mp4',
// ].join(' ');

const setupParams = async (type, path, streamIndex, transcode) => {
  const tempDir = `${CACHE_DIR}/${path.replace(/\//gu, '-')}/${type}`;
  await mkdir(tempDir, { recursive: true });

  const tempFile = `${tempDir}/${streamIndex}${transcode ? 'tr' : ''}.mp4`;

  const sleepMS = !transcode ? 1000 : 5000;

  let codecOptions = null;
  if (transcode) {
    switch (type) {
      case 'audio':
        codecOptions = '-c:a aac';
        break;

      case 'video':
        codecOptions = '-c:v h264_nvenc -pix_fmt yuv420p -movflags frag_keyframe+empty_moov';
        break;

      default:
        throw new Error('unknown type');
    }
  }

  return { codecOptions, sleepMS, tempFile };
};

const stream = (type) => async (req, res) => {
  const { params } = req;

  const { path, streamIndex, transcode } = params;

  const { codecOptions, sleepMS, tempFile } = await setupParams(type, path, streamIndex, transcode);

  extractStream(path, streamIndex, codecOptions, tempFile);

  res.setHeader('content-type', 'video/mp4');
  await sleep(1000);

  await streamFile(tempFile, res, { sleepMS });

  res.status(200);
  res.end();
};

module.exports = stream;
