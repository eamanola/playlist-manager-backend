const supertest = require('supertest');
const yup = require('yup');
const { rm } = require('node:fs/promises');

const app = require('../app');
const { cachePath } = require('./create-thumbnails');

const api = supertest(app);

// This is quick test
// Test files not provided
// make sure MEDIA_LIBS contain 1 video
// make sure config is setup

describe('test paths', () => {
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
          videos: yup.array().of(yup.string()).required(),
        }).noUnknown().strict(),
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
      const paths = (await api.get('/videos'))
        .body
        .map(({ videos }) => videos)
        .flat();

      const { body, status } = await api.post('/probes').send(paths);
      expect({ body, status }).toEqual({ body: expect.any(Array), status: 200 });
    });

    it('schema', async () => {
      const paths = (await api.get('/videos'))
        .body
        .map(({ videos }) => videos)
        .flat();

      const { body: probes } = await api.post('/probes').send(paths);

      const schema = yup.array().of(
        yup.object().shape({
          path: yup.string().required(),
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
    const cacheId = 'foo';

    afterAll(async () => rm(cachePath(cacheId)));

    it('POST /create-thumbnails should return 200', async () => {
      const { body: mediaLibs } = await api.get('/videos');
      const path = mediaLibs[0].videos[0];

      const { status } = await api.post('/create-thumbnails').send([{ cacheId, path }]);
      expect(status).toBe(200);
    });

    it('GET /thumbnails/:id should return image', async () => {
      const { status, type } = await api.get(`/thumbnails/${cacheId}.jpg`);
      expect(/image/iu.test(type)).toBe(true);
      expect(status).toBe(200);
    });
  });
});
