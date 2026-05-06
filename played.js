const { router: restRouter } = require('automata-rest');

const tableName = 'played';

const columns = [{ name: 'isPlayed', required: true, type: 'bool' }, { name: 'mediaId', required: true, type: 'string' }];

const indexes = [];

const table = { columns, indexes, name: tableName };

const router = restRouter(null, {
  resultKey: 'played',
  resultsKey: 'playedList',
  table,
  useCache: false,
  userRequired: false,
});

module.exports = { router };
