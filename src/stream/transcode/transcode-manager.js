const { utils } = require('automata-utils');

const { logger } = utils;

const activeProcs = [];

const findProc = (id, type, streamIndex, pid) => activeProcs.findIndex(
  ({
    id: aId, pid: aPid, streamIndex: aStreamIndex, type: aType,
  }) => id === aId && pid === aPid && streamIndex === aStreamIndex && type === aType,
);

const addProc = (id, type, streamIndex, proc) => {
  activeProcs.push({
    id, pid: proc.pid, streamIndex, type,
  });

  if (activeProcs.length > 2) logger.warn(activeProcs.length, 'transcoders active');

  proc.on('exit', () => {
    const procIndex = findProc(id, type, streamIndex, proc.pid);
    activeProcs.splice(procIndex, 1);
    logger.info(activeProcs.length, 'active transcoders remain');
  });
};

module.exports = {
  add: addProc,
};
