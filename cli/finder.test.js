const {
  mkdtemp,
  rm,
  mkdirSync,
  stat,
} = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const touch = require('touch');
const find = require('./finder');

let TEST_DIR = null;

describe('finder', () => {
  beforeAll(() => new Promise((resolve, reject) => {
    mkdtemp(join(tmpdir(), 'file-finder'), (err, directory) => {
      if (err) {
        reject();
        return;
      }

      TEST_DIR = directory;

      touch.sync(join(TEST_DIR, 'foo.txt'));
      touch.sync(join(TEST_DIR, 'foo'));
      touch.sync(join(TEST_DIR, 'foo.mp4'));
      touch.sync(join(TEST_DIR, 'foo.mkv'));

      mkdirSync(join(TEST_DIR, 'sub-folder'));
      touch.sync(join(TEST_DIR, 'sub-folder', 'foo.ass'));

      mkdirSync(join(join(TEST_DIR, 'sub-folder'), 'sub-sub-folder'));
      touch.sync(join(join(join(TEST_DIR, 'sub-folder'), 'sub-sub-folder'), 'foo.ass'));

      resolve();
    });
  }));

  afterAll(() => new Promise((resolve, reject) => {
    rm(
      TEST_DIR,
      { force: true, recursive: true },
      (err) => (err ? reject() : resolve()),
    );
  }));

  it('should find files', async () => {
    const files = await find(TEST_DIR);
    expect(files.length > 0).toBe(true);
  });

  it('should filter by extension', async () => {
    const files = await find(TEST_DIR, { extentions: ['txt'] });
    expect(files.length).toBe(1);
  });

  it('should filter by extension (multiple)', async () => {
    const files = await find(TEST_DIR, { extentions: ['mp4', 'mkv'] });
    expect(files.length).toBe(2);

    expect((await find(TEST_DIR, { extentions: ['exe'] })).length).toBe(0);
    expect((await find(TEST_DIR, { extentions: ['exe', 'mkv'] })).length).toBe(1);
  });

  it('should find recursively', async () => {
    const files = await find(TEST_DIR, { extentions: ['ass'] });
    expect(files.length).toBe(2);
  });

  it('should return name and path', async () => {
    const files = await find(TEST_DIR, { extentions: ['txt'] });
    const { path, name } = files[0];

    expect(!!name).toBe(true);
    expect(!!path).toBe(true);

    await new Promise((resolve, reject) => {
      stat(join(path, name), (err, stats) => {
        expect(!err).toBe(true);
        expect(stats.isFile()).toBe(true);

        return err ? reject() : resolve();
      });
    });
  });

  it('should throw ENOENT, "no such file or directory"', async () => {
    const path = 'foo';

    await new Promise((resolve, reject) => {
      stat(path, (err) => {
        expect(!!err).toBe(true);

        return err ? resolve() : reject();
      });
    });

    try {
      await find('foo');
      expect('unreachanble').toBe(true);
    } catch ({ code, message }) {
      expect(code).toBe('ENOENT');
      expect(/no such file or directory/ui.test(message)).toBe(true);
    }
  });

  it('should filter folder', async () => {
    const files = await find(TEST_DIR);

    files.forEach(async ({ name, path }) => {
      await new Promise((resolve, reject) => {
        stat(join(path, name), (err, stats) => {
          expect(!err).toBe(true);
          expect(stats.isFile()).toBe(true);

          return err ? reject() : resolve();
        });
      });
    });
  });
});
