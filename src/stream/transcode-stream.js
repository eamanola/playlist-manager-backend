const { exec, spawn } = require('node:child_process');
const { rm, rename } = require('node:fs/promises');
const { createWriteStream } = require('node:fs');

const { utils } = require('automata-utils');
const kill = require('tree-kill');

const { cachePath, tmpPath } = require('./output-path');
const { transcode } = require('./format');

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

const transcodeStream = (type) => async (req, res, next) => {
  logger.info('-- transcode');

  const { params } = req;
  const { path, streamIndex } = params;

  const { codecOptions, mime } = transcode(type);

  const output = await tmpPath(type, path, streamIndex);

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
      await cachePath(type, path, streamIndex),
    );
  };

  res.setHeader('content-type', mime);

  const cache = createWriteStream(output);
  const proc = spawn([cmd, ...args].join(' '), null, { shell: true });
  proc.stdout.pipe(res);
  proc.stdout.pipe(cache);

  proc.on('close', (code, signal) => {
    const success = code === 0 && signal === null;
    logger.info(proc.pid, 'proc close:', 'success:', success, 'code:', code, 'signal:', signal);

    if (!success) {
      logger.info(proc.pid, 'removing tmp files');
      rm(output);

      next({ message: 'transcode failed' });
    } else {
      onSuccess();
    }
  });

  cache.on('close', () => {
    console.log(proc.pid, 'cache closed');
  });

  proc.on('exit', (code, signal) => {
    console.log(proc.pid, 'proc exit', 'code:', code, 'signal:', signal);
  });

  req.on('close', () => {
    logger.info(proc.pid, 'connection closed');

    const HEAD_START = 0;
    setTimeout(() => {
      logger.info(proc.pid, 'exitCode', proc.exitCode);
      if (proc.exitCode === null) {
        logger.info(proc.pid, 'killing');

        kill(proc.pid, 'SIGKILL');
      }
    }, HEAD_START);
  });

  proc.stderr.pipe(process.stdout);
  // on('data', logProgress(proc));
};

module.exports = transcodeStream;
