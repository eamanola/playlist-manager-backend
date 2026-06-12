const { logger } = require('automata-utils');

const DISABLE = false;

// https://studio.apollographql.com/sandbox/explorer?endpoint=https://graphql.anilist.co
// https://developers.cloudflare.com/analytics/graphql-api/getting-started/execute-graphql-query/
const anilistQuery = `
query Query($search: String) {
  Media (search: $search) {
    coverImage {
      large
    }
    title {
      english
    }
    idMal
  }
}`.trim();

const fetchAnilist = async (query) => {
  const response = await fetch(
    'https://graphql.anilist.co',
    {
      body: JSON.stringify({
        query: anilistQuery,
        variables: { search: query },
      }),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    },
  );

  const json = await response.json();
  const { errors, data } = json;

  // console.log('anilist:', query, json);
  if (errors) {
    return null;
  }

  const { coverImage, idMal: malId, title } = data.Media;
  return {
    image: coverImage.large,
    malId,
    title,
  };
};

// https://docs.api.jikan.moe/#/anime/getanimesearch
const fetchJikan = async (query) => {
  const response = await fetch(
    `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`,
  );

  const json = await response.json();

  const { mal_id: malId, images, title } = json.data[0];
  // console.log('jikan', query, malId, images.webp.image_url, title);

  return {
    image: images.webp.image_url,
    malId,
    title,
  };
};

const router = () => async (req, res/* , next */) => {
  const { query } = req;
  const { q } = query;

  const searchQueries = (Array.isArray(q) ? q : [q])
    .map((aQuery) => decodeURIComponent(aQuery));

  const responses = [];

  for (let i = 0; i < searchQueries.length; i += 1) {
    const aQuery = searchQueries[i];

    if (DISABLE) {
      responses.push({ meta: null, q: aQuery });
      // eslint-disable-next-line no-continue
      continue;
    }

    let response = null;

    try {
      // eslint-disable-next-line no-await-in-loop
      response = await fetchAnilist(aQuery);

      if (!response) {
        logger.info(aQuery, 'fetch jikan');
        // eslint-disable-next-line no-await-in-loop
        response = await fetchJikan(aQuery);
      }
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
