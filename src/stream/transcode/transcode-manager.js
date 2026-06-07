const { utils } = require('automata-utils');

const { logger } = utils;

const activeProcs = [];

const findProc = (id, type, streamIndex) => activeProcs.findIndex(
  ({ id: aId, streamIndex: aStreamIndex, type: aType }) => (
    id === aId && streamIndex === aStreamIndex && type === aType
  ),
);

const onExit = (id, type, streamIndex, pid) => (/* code, signal */) => {
  const procIndex = findProc(id, type, streamIndex, pid);

  activeProcs.splice(procIndex, 1);

  logger.info(activeProcs.length, 'active transcoders remain');
};

const addProc = (id, type, streamIndex, proc) => {
  activeProcs.push({
    id, pid: proc.pid, streamIndex, type,
  });

  if (activeProcs.length > 2) logger.warn(activeProcs.length, 'transcoders active');

  proc.on('exit', onExit(id, type, streamIndex, proc.pid));
};

module.exports = {
  add: addProc,
};
