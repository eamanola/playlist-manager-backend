const {
  mkdir, rm, access, constants, readFile,
} = require('node:fs/promises');
const { exec } = require('node:child_process');
const kill = require('tree-kill');

const streamFile = require('./stream-file');
const { CACHE_DIR } = require('../config');
// const exec = require('../cli/exec-promisified');

const sleep = (ms) => (new Promise((resolve) => { setTimeout(resolve, ms); }));

const exists = async (path) => {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch (err) {
    return false;
  }
};

const extractStream = (input, streamIndex, codecOptions, output) => {
  const cmd = 'ffmpeg';
  const args = [
    '-y',
    '-i', `"${input}"`,
    '-map', `0:${streamIndex}`,
    ...(codecOptions || '-c copy').split(' '),
    `"${output}"`,
  ];

  console.log([cmd, ...args].join(' '));
  return exec([cmd, ...args].join(' '));
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

  const output = `${tempDir}/${streamIndex}${transcode ? 'tr' : ''}.mp4`;

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

  return { codecOptions, output, sleepMS };
};

const stream = (type) => async (req, res) => {
  const { params } = req;

  const { path, streamIndex, transcode } = params;

  const { codecOptions, output, sleepMS } = await setupParams(type, path, streamIndex, transcode);

  res.setHeader('content-type', `${type}/mp4`);

  if (!(await exists(output))) {
    const proc = extractStream(path, streamIndex, codecOptions, output);

    req.on('close', () => {
      if (proc.exitCode === null) {
        console.log('Stopping transcode, killing', proc.pid);
        kill(proc.pid, 'SIGKILL', () => {
          rm(output);
        });
      }
    });

    // proc.stdout.on('data', (data) => console.log(data));

    await sleep(1000);
    try {
      await streamFile(output, res, { sleepMS });
    } catch (err) {
      console.log(err);
    }
  } else {
    res.send(await readFile(output));
  }

  res.status(200);
  res.end();
};

module.exports = stream;
