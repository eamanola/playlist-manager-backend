const { rm } = require('node:fs/promises');

const supertest = require('supertest');
const yup = require('yup');
const express = require('express');

const { cachePath } = require('./create-thumbnails');
const { router } = require('.');

let api;

// This is quick test
// Test files not provided
// make sure MEDIA_LIBS contain 1 video
// make sure config is setup

describe('test paths', () => {
  beforeAll(() => {
    const app = express();
    app.use(express.json());
    app.use(router({ db: global.db }));
    api = supertest(app);
  });

  describe('GET /videos', () => {
    it('should fetch a list', async () => {
      const { body, status } = await api.get('/videos');

      expect({ body, status }).toEqual({ body: expect.any(Array), status: 200 });
    });

    it('schema', async () => {
      const { body: videos } = await api.get('/videos');

      const schema = yup.array().of(
        yup.object().shape({
          mediaLib: yup.string().required(),
          videos: yup.array().of(yup.object().shape({
            id: yup.string().required(),
          })).strict(),
        }),
      );

      try {
        await schema.validate(videos);
        expect(true).toBe(true);
      } catch {
        expect(true).toBe(false);
      }
    });
  });

  describe('GET /probes', () => {
    it('should fetch a list', async () => {
      const all = (await api.get('/videos'))
        .body
        .map(({ videos }) => videos)
        .flat();

      const ids = [all[0].id];

      const { body, status } = await api.post('/probes').send(ids);
      expect({ body, status }).toEqual({ body: expect.any(Array), status: 200 });
    });

    it('schema', async () => {
      const all = (await api.get('/videos'))
        .body
        .map(({ videos }) => videos)
        .flat();

      const ids = [all[0].id];

      const { body: probes } = await api.post('/probes').send(ids);

      const schema = yup.array().of(
        yup.object().shape({
          id: yup.string().required(),
          probe: yup.object().shape({
            audios: yup.array().of(
              yup.object().shape({
                codec: yup.string().required(),
                index: yup.number().required(),
                language: yup.string().required(),
              }).noUnknown().strict(),
            ).required(),
            chapters: yup.array().of(
              yup.object().shape({
                end: yup.number().required(),
                start: yup.number().required(),
                title: yup.string(),
              }).noUnknown().strict(),
            ).required(),
            duration: yup.number().required(),
            fonts: yup.array().of(
              yup.object().shape({
                filename: yup.string().required(),
                mimetype: yup.string().required(),
              }).noUnknown().strict(),
            ).required(),
            format: yup.string().required(),
            subtitles: yup.array().of(
              yup.object().shape({
                codec: yup.string().required(),
                index: yup.number().required(),
                language: yup.string().required(),
                title: yup.string(),
              }).noUnknown().strict(),
            ).required(),
            video: yup.object().shape({
              codec: yup.string().required(),
              index: yup.number().required(),
            })
              .noUnknown()
              .strict()
              .required(),
          })
            .noUnknown()
            .strict()
            .required(),
        }).noUnknown().strict(),
      );

      try {
        await schema.validate(probes, { strict: true, stripUnknown: false });
        expect(true).toBe(true);
      } catch {
        expect(true).toBe(false);
      }
    });
  });

  describe('thumbnails', () => {
    let id = null;

    beforeAll(async () => {
      const { body: mediaLibs } = await api.get('/videos');
      const { id: videoId } = mediaLibs[0].videos[0];
      id = videoId;
    });

    afterAll(async () => rm(cachePath(id)));

    it('POST /create-thumbnails should return 200', async () => {
      const { status } = await api.post('/create-thumbnails').send([id]);
      expect(status).toBe(200);
    });

    it('GET /thumbnails/:id should return image', async () => {
      const { status, type } = await api.get(`/thumbnails/${id}.jpg`);
      expect(/image/iu.test(type)).toBe(true);
      expect(status).toBe(200);
    });
  });
});
