const { utils } = require('automata-utils');
const kill = require('tree-kill');

const { logger } = utils;

const activeProcs = [];

const findProc = (id, type, streamIndex) => activeProcs.findIndex(
  ({ id: aId, streamIndex: aStreamIndex, type: aType }) => (
    id === aId && streamIndex === aStreamIndex && type === aType
  ),
);

const onExit = ({ id, type, streamIndex }) => (/* code, signal */) => {
  const procIndex = findProc(id, type, streamIndex);

  activeProcs.splice(procIndex, 1);

  logger.info(activeProcs.length, 'active transcoders remain');
};

const onDublicate = ({
  id, type, streamIndex, pid,
}) => {
  logger.warn(pid, 'is already handling', id, type, streamIndex);

  // TODO: handle dublicate requests
  // reproduce:
  // - reload player

  kill(pid, 'SIGTERM');
};

const addProc = (id, type, streamIndex, proc) => {
  const runningIndex = findProc(id, type, streamIndex);
  if (runningIndex !== -1) {
    const running = activeProcs[runningIndex];
    onDublicate(running);
  }

  const activeProc = {
    id, pid: proc.pid, streamIndex, type,
  };
  activeProcs.push(activeProc);

  if (activeProcs.length > 2) logger.warn(activeProcs.length, 'transcoders active');

  proc.on('exit', onExit(activeProc));
};

module.exports = {
  add: addProc,
};
