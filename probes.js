const { getVideos } = require('./videos');
const probe = require('./cli/probe');

const getProbes = async () => {
  const paths = (await getVideos()).map(({ videos }) => videos).flat();
  const probes = await Promise.all(paths.map((path) => probe(path)));

  return probes.map((probeObj, index) => ({
    path: paths[index],
    probe: probeObj,
  }));
};

const probes = async (req, res, next) => {
  try {
    res.status(200).json(await getProbes());
  } catch (err) {
    next(err);
  }
};

module.exports = {
  router: probes,
};
