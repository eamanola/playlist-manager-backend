const probe = require('./cli/probe');

const getProbes = async (paths) => {
  const probes = await Promise.all(paths.map((path) => probe(path)));

  return probes.map((probeObj, index) => ({
    path: paths[index],
    probe: probeObj,
  }));
};

const probes = async (req, res, next) => {
  const { body: paths } = req;

  try {
    res.status(200).json(await getProbes(paths));
    return true;
  } catch (err) {
    next(err);
    return false;
  }
};

module.exports = {
  router: probes,
};
