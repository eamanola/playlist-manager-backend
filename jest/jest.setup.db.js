const { drivers } = require('automata-db');

global.db = drivers({ DB_ENGINE: 'sqlite' });

const SKIP_PATHS = [];
const { testPath } = expect.getState();
const skip = () => SKIP_PATHS.some((skipPath) => testPath.includes(skipPath));

beforeAll(async () => {
  if (skip()) {
    return;
  }

  await global.db.connectDB(':memory:');
});

afterAll(async () => {
  if (skip()) {
    return;
  }

  await global.db.closeDB();
});
