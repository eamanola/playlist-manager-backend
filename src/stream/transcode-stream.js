const { spawn } = require('node:child_process');
const { rm, rename } = require('node:fs/promises');
const { createWriteStream } = require('node:fs');

const { utils } = require('automata-utils');

const { cachePath, tmpPath } = require('./output-path');
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

const postProcess = (type, format, tmpFile, cacheFile) => {
  logger.info('-- post-process:');

  // if (type === 'video' && format === 'mp4') {
  //   logger.info('--- moving moov:');

  //   const cmd1 = 'ffmpeg';
  //   const args1 = [
  //     '-y',
  //     '-i',
  //     `"${tmpFile}"`,
  //     '-c:v',
  //     'copy',
  //     '-f',
  //     'mp4',
  //     `"${cacheFile}"`,
  //   ];

  //   const command = [cmd1, ...args1].join(' ');
  //   logger.info('---', command);
  //   exec([cmd1, ...args1].join(' '), (moveErr) => {
  //     logger.info(moveErr || '--- moved');

  //     logger.info('--- removing tmp files');
  //     rm(tmpFile);
  //   });
  // } else {
  logger.info('--- move tmp files to cache');
  rename(tmpFile, cacheFile);
  // }
};

const transcodeStream = async (id, type, streamIndex, { onError, onStart }) => {
  logger.info('-- transcode', type, id);

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
  logger.info('---', command);
  const proc = spawn([cmd, ...args].join(' '), null, { shell: true });
  if (onStart) {
    onStart({ format, proc });
  }

  // send out to file
  const output = await tmpPath(id, type, streamIndex);
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
      const onSuccess = async () => postProcess(
        type,
        format,
        output,
        await cachePath(id, type, streamIndex),
      );
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
