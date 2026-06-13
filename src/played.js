const { router: restRouter } = require('automata-rest');

const tableName = 'played';

const columns = [
  { name: 'isPlayed', required: true, type: Boolean },
  { name: 'mediaId', required: true, type: String },
];

const indexes = [];

const table = { columns, indexes, name: tableName };

const router = ({ db }) => restRouter(null, {
  db,
  resultKey: 'played',
  resultsKey: 'playedList',
  table,
  useCache: false,
  userRequired: false,
});

module.exports = { router };
