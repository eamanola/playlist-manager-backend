const duration = require('./duration');
const exec = require('./exec-promisified');

describe('duration', () => {
  it('ffprobe should be installed', () => {
    try {
      const help = exec('ffprobe --help');
      expect(!!help).toBe(true);
    } catch (err) {
      expect('should not throw').toBe(true);
    }
  });

  it('should throw, if file doesn exist', async () => {
    try {
      await duration('foo');
      expect('should throw').toBe(true);
    } catch ({ message }) {
      expect(/Command failed/iu.test(message)).toBe(true);
      expect(/No such file or directory/iu.test(message)).toBe(true);
    }
  });
});
