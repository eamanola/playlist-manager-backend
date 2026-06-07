const { spawn } = require('node:child_process');
const { rename } = require('node:fs/promises');
const { createWriteStream, createReadStream, rmSync } = require('node:fs');

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

const rePipe = (proc, mediaStream, destination) => {
  const wasPaused = proc.stdout.isPaused();

  if (!wasPaused) {
    logger.info('---- pausing proc');
    proc.stdout.pause();
  }

  const tmpFile = procTmpFile(proc.pid, mediaStream);
  const encoded = createReadStream(tmpFile);

  encoded.on('end', () => {
    logger.info('---- available written');

    logger.info('---- attaching to proc');
    proc.stdout.pipe(destination);

    if (!wasPaused) {
      logger.info('---- resuming proc');
      proc.stdout.resume();
    }
  });

  logger.info('---- write available');
  encoded.pipe(destination, { end: false });
};

const newTranscode = (command, mediaStream, destination) => {
  logger.info('---', command);
  const proc = spawn(command, null, { shell: true });

  const tmpFile = procTmpFile(proc.pid, mediaStream);

  // send out to tmpFile
  const tmp = createWriteStream(tmpFile);
  proc.stdout.pipe(tmp);

  // send out to destination
  proc.stdout.pipe(destination);

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

  // proc.on('error', (err) => {
  //   logger.info(proc.pid, 'proc error:', err);
  // });
  // tmp.on('error', (err) => {
  //   logger.info(proc.pid, 'cache error', err);
  // });
  // destination.on('error', (err) => {
  //   logger.info(proc.pid, 'connection error', err);
  // });

  // all done
  // proc.on('close', (code, signal) => {
  //   const success = code === 0 && signal === null;
  //   logger.info(proc.pid, 'proc close:', 'success:', success, 'code:', code, 'signal:', signal);
  // });
  // tmp.on('close', () => {
  //   logger.info(proc.pid, 'cache closed');
  // });

  return proc;
};

const transcode = (mediaStream, destination) => {
  logger.info('-- transcode', mediaStream.type, mediaStream.id);

  const { command, format } = getOpts(mediaStream);

  let proc = manager.get(mediaStream);
  if (proc !== null) {
    logger.info('--- attach to running proc');
    rePipe(proc, mediaStream, destination);
  } else {
    logger.info('--- start new proc');
    proc = newTranscode(command, mediaStream, destination);
    manager.add(mediaStream, proc);
  }

  destination.on('close', () => {
    logger.info(proc.pid, 'destination closed connection');

    proc.stdout.unpipe(destination);
    // TBD:
    // - finish transcode, and send cache next time
    // - pause transcode, and repipe if needed
    proc.stdout.resume();
  });

  return { format };
};

module.exports = transcode;
