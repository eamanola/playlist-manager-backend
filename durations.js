const { getVideos } = require('./videos');
const duration = require('./cli/duration');

const getDurations = async () => {
  const paths = (await getVideos()).map(({ videos }) => videos).flat();
  const durations = await Promise.all(paths.map((path) => duration(path)));

  return paths.map((path, index) => ({
    duration: durations[index],
    path,
  }));
};

const durations = async (req, res, next) => {
  try {
    res.status(200).json(await getDurations());
  } catch (err) {
    next(err);
  }
};

module.exports = {
  router: durations,
};
