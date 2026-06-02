const probe = require('./cli/probe');
const cache = require('./temp-cache');

const getProbes = async (ids) => {
  const probes = await Promise.all(ids.map((id) => probe(cache.getPath(id))));

  return probes.map((probeObj, index) => ({
    id: ids[index],
    probe: probeObj,
  }));
};

const probes = async (req, res, next) => {
  const { body: ids } = req;

  try {
    res.status(200).json(await getProbes(ids));
    return true;
  } catch (err) {
    next(err);
    return false;
  }
};

module.exports = {
  router: probes,
};
