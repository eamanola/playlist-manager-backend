const { spawn } = require('node:child_process');
const { rename } = require('node:fs/promises');
const { createWriteStream, rmSync } = require('node:fs');

const { utils } = require('automata-utils');

const { cacheFilePath, tmpFilePath } = require('../output-path');
const { formatOptions, transcodeOptions } = require('../format');
const tempCache = require('../../temp-cache');
const manager = require('./transcode-manager');

const { logger } = utils;

// avg_br
// br
// frame
// out
// PSNR
// q
// f_size
// s_size
// st
// time
// type
// const getStats = (statsStr, stats) => stats.reduce((final, stat) => {
//   const match = statsStr.match(new RegExp(`${stat}=\\s*(?<value>[^\\s]+)`, 'u'));
//   if (match) {
//     const { value } = match.groups;
//     return { ...final, [stat]: value };
//   }

//   return { ...final };
// }, {});

// const logProgress = ({ pid }) => (stderr) => {
//   const stats = getStats(String(stderr), [
//     'q',
//     'time',
//     'speed',
//   ]);

// const statsStr = Object.keys(stats).reduce((final, key) => `${final} ${key}=${stats[key]}`, '');

//   // process.stdout.clearLine(0);
//   process.stdout.cursorTo(0);
//   process.stdout.write(`${pid}: ${statsStr}`);

//   const { speed } = stats;

//   if (speed) {
//     if (Number(speed.replace('x', '')) < 1) {
//       logger.warn(pid, 'slow transcode, consider lowering quality');
//     }
//   }
// };

const getOpts = ({ id, type, streamIndex }) => {
  const path = tempCache.getPath(id);

  const { encoder, encoderOpts, format } = transcodeOptions(type);
  const { formatOpts } = formatOptions(format);

  const cmd = 'ffmpeg';
  const args = [
    '-y',
    '-v',
    'error',
    '-stats',
    '-i',
    `"${path}"`,
    '-map_chapters',
    '-1',
    '-map_metadata',
    '-1',
    '-map',
    `0:${streamIndex}`,
    `-c:${type[0].toLowerCase()}`,
    encoder,
    ...encoderOpts.split(' '),
    '-f',
    format,
    ...(formatOpts || '').split(' '),
    // `"${output}"`,
    'pipe:1',
  ];
  const command = [cmd, ...args].join(' ');

  return { command, format };
};

const procTmpFile = (pid, mediaStream) => `${tmpFilePath(mediaStream)}.${pid}`;

const newTranscode = (command, mediaStream) => {
  logger.info('---', command);
  const proc = spawn(command, null, { shell: true });

  const tmpFile = procTmpFile(proc.pid, mediaStream);

  // send out to tmpFile
  const tmp = createWriteStream(tmpFile);
  proc.stdout.pipe(tmp);

  // send -stats to stdout
  proc.stderr.pipe(process.stdout);
  // proc.stderr.on('data', logProgress(proc));

  proc.on('exit', (code, signal) => {
    const success = code === 0 && signal === null;
    logger.info(proc.pid, 'proc exit', 'success:', success, 'code:', code, 'signal:', signal);

    if (success) {
      logger.info(proc.pid, 'moving tmp files to cache');

      const cacheFile = cacheFilePath(mediaStream);
      // note: rename is async
      rename(tmpFile, cacheFile);
    } else {
      logger.info(proc.pid, 'removing tmp files');

      rmSync(tmpFile);
    }
  });

  return proc;
};

const transcode = (mediaStream) => {
  logger.info('-- transcode', mediaStream);

  const { command, format } = getOpts(mediaStream);

  const existing = manager.get(mediaStream);
  const encoder = existing || newTranscode(command, mediaStream);
  const encoded = existing ? procTmpFile(existing.pid, mediaStream) : null;

  if (existing === null) {
    manager.add(mediaStream, encoder);

    logger.info('--- started a new encoder');
  } else {
    logger.info('--- attached to a running encoder');
  }

  return { encoded, encoder, format };
};

module.exports = transcode;
