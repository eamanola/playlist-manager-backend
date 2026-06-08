const { logger } = require('automata-utils').utils;

// Stats
// =====
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

const getStats = (statsStr, stats) => stats.reduce((final, stat) => {
  const match = statsStr.match(new RegExp(`${stat}=\\s*(?<value>[^\\s]+)`, 'u'));
  if (match) {
    const { value } = match.groups;
    return { ...final, [stat]: value };
  }

  return { ...final };
}, {});

const logProgress = ({ pid }) => (stderr) => {
  const stats = getStats(String(stderr), ['q', 'time', 'speed']);

  const statsStr = Object.keys(stats).reduce((final, key) => `${final} ${key}=${stats[key]}`, '');

  // process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  process.stdout.write(`${pid}: ${statsStr}`);

  const { speed } = stats;

  if (speed) {
    if (Number(speed.replace('x', '')) < 1) {
      logger.warn(pid, 'slow transcode, consider lowering quality');
    }
  }
};

module.exports = logProgress;
