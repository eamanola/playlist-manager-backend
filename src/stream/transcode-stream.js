const { exec, spawn } = require('node:child_process');
const { rm, rename } = require('node:fs/promises');
const { createWriteStream } = require('node:fs');

const { utils } = require('automata-utils');

const { cachePath, tmpPath } = require('./output-path');
const { transcode } = require('./format');
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

const postProcess = (mime, tmpFile, cacheFile) => {
  logger.info('post-process');

  if (mime === 'video/mp4') {
    logger.info('moving moov:');

    const cmd1 = 'ffmpeg';
    const args1 = [
      '-y',
      '-i',
      `"${tmpFile}"`,
      '-c:v',
      'copy',
      '-f',
      'mp4',
      `"${cacheFile}"`,
    ];
    logger.info('-', [cmd1, ...args1].join(' '));

    exec([cmd1, ...args1].join(' '), (moveErr) => {
      logger.info(moveErr);

      logger.info('removing tmp files');
      rm(tmpFile);
    });
  } else {
    logger.info('move tmp files to cache');
    rename(tmpFile, cacheFile);
  }
};

const transcodeStream = async (id, type, streamIndex, { onError, onStart }) => {
  logger.info('-- transcode');

  const path = tempCache.getPath(id);
  const { codecOptions, mime } = transcode(type);
  const output = await tmpPath(id, type, streamIndex);
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
    ...codecOptions.split(' '),
    // `"${output}"`,
    'pipe:1',
  ];
  logger.info('-', [cmd, ...args].join(' '));

  const onSuccess = async () => {
    postProcess(
      mime,
      output,
      await cachePath(id, type, streamIndex),
    );
  };

  const proc = spawn([cmd, ...args].join(' '), null, { shell: true });
  if (onStart) {
    onStart({ mime, proc });
  }

  // send out to file
  const cache = createWriteStream(output);
  proc.stdout.pipe(cache);

  // log -stats
  proc.stderr.pipe(process.stdout);
  // proc.stderr.on('data', logProgress(proc));

  // done
  proc.on('close', (code, signal) => {
    const success = code === 0 && signal === null;
    logger.info(proc.pid, 'proc close:', 'success:', success, 'code:', code, 'signal:', signal);

    if (!success) {
      logger.info(proc.pid, 'removing tmp files');
      rm(output);

      if (onError) {
        onError(new Error('Transcode failed'));
      }
    } else {
      onSuccess();
    }
  });

  // cache.on('close', () => {
  //   console.log(proc.pid, 'cache closed');
  // });

  // proc.on('exit', (code, signal) => {
  //   console.log(proc.pid, 'proc exit', 'code:', code, 'signal:', signal);
  // });
};

module.exports = transcodeStream;
