const probe = require('./cli/probe');
const cache = require('./temp-cache');

const getProbes = async (ids) => {
  const paths = ids.map((id) => cache.getPath(id));
  const probes = await Promise.all(paths.map((path) => probe(path)));

  return probes.map((probeObj, index) => ({
    id: ids[index],
    probe: probeObj,
  }));
};

const probes = async (req, res, next) => {
  const { id: ids } = req.query;

  try {
    res.status(200).json(await getProbes(Array.isArray(ids) ? ids : [ids]));
    return true;
  } catch (err) {
    next(err);
    return false;
  }
};

module.exports = {
  router: probes,
};
