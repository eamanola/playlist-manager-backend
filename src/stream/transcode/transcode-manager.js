const { utils } = require('automata-utils');
const kill = require('tree-kill');

const { logger } = utils;

const activeProcs = [];

const nuke = (exitCode) => {
  const actives = [...activeProcs];
  const { length } = actives;

  const code = typeof exitCode === 'number' ? exitCode : undefined;
  const signal = typeof exitCode === 'string' ? exitCode : undefined;

  while (actives.length) {
    const { proc } = actives.pop();
    // handled by process
    kill(proc.pid, 'SIGTERM');
    proc.emit('exit', code, signal);
    logger.info('nuked', proc.pid);
  }

  logger.info(signal || code, 'nuked', length);
};

// process.on('SIGINT', () => logger.info('on SIGINT'));
// process.on('SIGTERM', () => logger.info('on SIGTERM'));
// process.on('exit', () => logger.info('on exit'));

// process.on('SIGTERM', nuke);
// process.on('SIGINT', nuke);
process.on('exit', nuke);

const findIndex = ({ id, type, streamIndex }) => activeProcs.findIndex(
  ({ mediaStream }) => (
    id === mediaStream.id && streamIndex === mediaStream.streamIndex && type === mediaStream.type
  ),
);

const onExit = (mediaStream) => (/* code, signal */) => {
  const procIndex = findIndex(mediaStream);

  activeProcs.splice(procIndex, 1);

  logger.info(activeProcs.length, 'active transcoders remain');
};

const onDublicate = ({ mediaStream, proc }) => {
  logger.warn(proc.pid, 'is already handling', mediaStream);

  logger.warn(proc.pid, 'killing', 'SIGTERM');
  kill(proc.pid, 'SIGTERM');
};

const addProc = (mediaStream, proc) => {
  const runningIndex = findIndex(mediaStream);
  if (runningIndex !== -1) {
    const running = activeProcs[runningIndex];
    onDublicate(running);
  }

  const activeProc = { mediaStream, proc };
  activeProcs.push(activeProc);

  if (activeProcs.length > 2) logger.warn(activeProcs.length, 'transcoders active');

  proc.on('exit', onExit(mediaStream));
};

const getProc = (mediaStream) => {
  const procIndex = findIndex(mediaStream);
  return procIndex !== -1 ? activeProcs[procIndex].proc : null;
};

module.exports = {
  add: addProc,
  get: getProc,
};
