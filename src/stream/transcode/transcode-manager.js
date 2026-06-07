const { utils } = require('automata-utils');
const kill = require('tree-kill');

const { logger } = utils;

const activeProcs = [];

const findIndex = (id, type, streamIndex) => activeProcs.findIndex(
  ({ id: aId, streamIndex: aStreamIndex, type: aType }) => (
    id === aId && streamIndex === aStreamIndex && type === aType
  ),
);

const onExit = ({ id, type, streamIndex }) => (/* code, signal */) => {
  const procIndex = findIndex(id, type, streamIndex);

  activeProcs.splice(procIndex, 1);

  logger.info(activeProcs.length, 'active transcoders remain');
};

const onDublicate = ({
  id, type, streamIndex, proc,
}) => {
  logger.warn(proc.pid, 'is already handling', id, type, streamIndex);

  // TODO: handle dublicate requests
  // reproduce:
  // - reload player

  kill(proc.pid, 'SIGTERM');
};

const addProc = (id, type, streamIndex, proc) => {
  const runningIndex = findIndex(id, type, streamIndex);
  if (runningIndex !== -1) {
    const running = activeProcs[runningIndex];
    onDublicate(running);
  }

  const activeProc = {
    id, proc, streamIndex, type,
  };
  activeProcs.push(activeProc);

  if (activeProcs.length > 2) logger.warn(activeProcs.length, 'transcoders active');

  proc.on('exit', onExit(activeProc));
};

const getProc = (id, type, streamIndex) => {
  const procIndex = findIndex(id, type, streamIndex);
  return procIndex !== -1 ? activeProcs[procIndex].proc : null;
};

module.exports = {
  add: addProc,
  get: getProc,
};
