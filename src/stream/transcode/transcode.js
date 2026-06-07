const { spawn } = require('node:child_process');
const { rm, rename } = require('node:fs/promises');
const { createWriteStream } = require('node:fs');

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

const transcode = async (id, type, streamIndex, { onEnd, onStart, writeable }) => {
  logger.info('-- transcode', type, id);

  const { command, format } = getOpts({ id, streamIndex, type });

  logger.info('---', command);
  const proc = spawn(command, null, { shell: true });

  manager.add(id, type, streamIndex, proc);

  if (onStart) {
    onStart({ format });
  }

  // send out to file
  const tmpFile = `${await tmpFilePath(id, type, streamIndex)}.${proc.pid}`;
  const cacheFile = await cacheFilePath(id, type, streamIndex);
  const cache = createWriteStream(tmpFile);
  proc.stdout.pipe(cache);

  // send out to client
  proc.stdout.pipe(writeable);

  // set logs/stats to stdout
  proc.stderr.pipe(process.stdout);
  // proc.stderr.on('data', logProgress(proc));

  proc.on('exit', async (code, signal) => {
    const success = code === 0 && signal === null;
    logger.info(proc.pid, 'proc exit', 'success:', success, 'code:', code, 'signal:', signal);

    if (success) {
      logger.info(proc.pid, 'moving tmp files to cache');

      await rename(tmpFile, cacheFile);
    } else if (!success) {
      logger.info(proc.pid, 'removing tmp files');

      await rm(tmpFile);
    }

    if (onEnd) onEnd(success);
  });

  writeable.on('close', () => {
    logger.info(proc.pid, 'client closed connection');

    proc.stdout.unpipe(writeable);
    proc.stdout.resume();
  });

  proc.on('error', (err) => {
    logger.info(proc.pid, 'proc error:', err);
  });
  cache.on('error', (err) => {
    logger.info(proc.pid, 'cache error', err);
  });
  writeable.on('error', (err) => {
    logger.info(proc.pid, 'connection error', err);
  });

  // all done
  // proc.on('close', (code, signal) => {
  //   const success = code === 0 && signal === null;
  //   logger.info(proc.pid, 'proc close:', 'success:', success, 'code:', code, 'signal:', signal);
  // });
  // cache.on('close', () => {
  //   logger.info(proc.pid, 'cache closed');
  // });
};

module.exports = transcode;
