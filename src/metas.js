const { anilist } = require('anilist');
const { logger } = require('automata-utils');

const DISABLE = true;

const router = () => async (req, res/* , next */) => {
  const { query } = req;
  const { q } = query;

  const searchQueries = (Array.isArray(q) ? q : [q])
    .map((aQuery) => decodeURIComponent(aQuery));

  // const foo = ['attack on titan', 'test1s2failNotfound'];

  const responses = [];

  for (let i = 0; i < searchQueries.length; i += 1) {
    const aQuery = searchQueries[i];
    let response = null;
    try {
      response = DISABLE
        ? null
        // eslint-disable-next-line no-await-in-loop
        : await anilist.query.media(aQuery)
          .withId()
          .withTitles()
          .withCoverImage()
          .fetch();
    } catch {
      logger.info(aQuery, 'not found');
    }

    responses.push({
      meta: response,
      q: aQuery,
    });
  }

  res.status(200).json(responses);
};

module.exports = { router };
