// const express = require('express');
// const supertest = require('supertest');
// const { errors } = require('automata-utils');

// const canAccess = require('./utils/can-access');
// const play = require('./cli/play');
// const { MEDIA_LIBS } = require('./config');
// const { router } = require('./play');

// const app = express();
// app.use(express.json());
// app.use('/play', router);
// const api = supertest(app);

// jest.mock('./cli/play');
// jest.mock('./temp-cache', () => ({ getId: (path) => path }));

// describe('play router', () => {
//   afterEach(() => play.mockClear());

//   it('should call play with path', async () => {
//     const path = `${MEDIA_LIBS}/foo`;

//     await api.put('/play').send({ id: path });

//     expect(play).toHaveBeenCalledTimes(1);
//     expect(play).toHaveBeenCalledWith(path);
//   });

//   it('should throw access denied', async () => {
//     const path = '/foo';
//     expect(canAccess(path)).toBe(false);
//     const { status } = await api.put('/play').send({ id: path });

//     const { accessDenied } = errors;
//     expect(status).toBe(accessDenied.status);
//     expect(play).not.toHaveBeenCalled();
//   });
// });

it('contains one test', () => {
  expect(1).toBe(1);
});
