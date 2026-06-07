const { utils } = require('automata-utils');

const { logger } = utils;

const activeProcs = [];

const addProc = (proc) => {
  activeProcs.push(proc.pid);
  if (activeProcs.length > 2) logger.warn(activeProcs.length, 'transcoders active');

  proc.on('exit', () => {
    activeProcs.splice(activeProcs.indexOf(proc.pid), 1);
    logger.info(activeProcs.length, 'active transcoders remain');
  });
};

module.exports = {
  add: addProc,
};
