const { spawn } = require('node:child_process');
const { rm, rename } = require('node:fs/promises');
const { createWriteStream } = require('node:fs');

const { utils } = require('automata-utils');
const kill = require('tree-kill');

const { cacheFilePath, tmpFilePath } = require('./output-path');
const { formatOptions, transcodeOptions } = require('./format');
const tempCache = require('../temp-cache');

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

const actives = [];

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

const transcodeStream = async (id, type, streamIndex, { onError, onStart, writeable }) => {
  logger.info('-- transcode', type, id);

  const { command, format } = getOpts({ id, streamIndex, type });

  logger.info('---', command);
  const proc = spawn(command, null, { shell: true });

  actives.push(proc.pid);
  if (actives.length > 2) logger.warn(actives.length, 'transcoders active');

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

  proc.on('exit', (code, signal) => {
    const success = code === 0 && signal === null;
    logger.info(proc.pid, 'proc exit', 'success:', success, 'code:', code, 'signal:', signal);

    actives.splice(actives.indexOf(proc.pid), 1);

    if (success) {
      logger.info(proc.pid, 'moving tmp files to cache');

      rename(tmpFile, cacheFile);
    } else if (!success) {
      logger.info(proc.pid, 'removing tmp files');

      rm(tmpFile);

      if (onError) {
        onError(new Error('Transcode failed'));
      }
    }
  });

  writeable.on('close', () => {
    logger.info(proc.pid, 'client closed connection');

    const HEAD_START = 50;
    setTimeout(() => {
      // Known Use cases:
      // 1) everything went well - no kill needed
      // 2) User navigates away from media page - kill / and restart transcode later ok
      // 3) User pauses media for too long - kill forces restart of transcode from 0:00
      // // TODO: better/a way to handle this
      logger.info(proc.pid, 'exitCode', proc.exitCode);
      if (proc.exitCode === null) {
        logger.info(proc.pid, 'SIGTERM proc');

        kill(proc.pid, 'SIGTERM');
      }
    }, HEAD_START);
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

module.exports = transcodeStream;
