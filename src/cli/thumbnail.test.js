const thumbnail = require('./thumbnail');
const exec = require('./exec-promisified');

describe('thumbnail', () => {
  it('ffmpeg should be installed', () => {
    try {
      const help = exec('ffmpeg --help');
      expect(!!help).toBe(true);
    } catch {
      expect('should not throw').toBe(true);
    }
  });

  it('should throw, if file doesn exist', async () => {
    try {
      await thumbnail('foo');
      expect('should throw').toBe(true);
    } catch ({ message }) {
      expect(/Command failed/iu.test(message)).toBe(true);
      expect(/No such file or directory/iu.test(message)).toBe(true);
    }
  });
});
