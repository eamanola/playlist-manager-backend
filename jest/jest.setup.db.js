const { connectDB, closeDB } = require('automata-db');

const { DB_URL } = require('../src/config');

const SKIP_PATHS = [];
const { testPath } = expect.getState();
const skip = () => SKIP_PATHS.some((skipPath) => testPath.includes(skipPath));

beforeAll(async () => {
  if (skip()) {
    return;
  }

  global.client = await connectDB(DB_URL);
});

afterAll(async () => {
  if (skip()) {
    return;
  }

  await closeDB(global.client);
});
