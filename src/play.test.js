const express = require('express');
const supertest = require('supertest');
const { errors } = require('automata-utils');

const canAccess = require('./utils/can-access');
const play = require('./cli/play');
const { router } = require('./play');
const cache = require('./temp-cache');

const app = express();
app.use(express.json());
app.use('/play', router);
const api = supertest(app);

jest.mock('./cli/play');

describe('play router', () => {
  afterEach(() => play.mockClear());
  beforeAll(() => cache.init());

  it('should call play with path', async () => {
    const { id } = cache.all()[0];
    const path = cache.getPath(id);

    await api.put('/play').send({ id });

    expect(play).toHaveBeenCalledTimes(1);
    expect(play).toHaveBeenCalledWith(path);
  });

  it('should throw access denied', async () => {
    const path = '/foo';
    cache.set([{ name: '', path }]);
    const { id } = cache.all()[0];

    expect(canAccess(path)).toBe(false);
    const { status } = await api.put('/play').send({ id });

    const { accessDenied } = errors;
    expect(status).toBe(accessDenied.status);
    expect(play).not.toHaveBeenCalled();
  });
});

it('contains one test', () => {
  expect(1).toBe(1);
});
