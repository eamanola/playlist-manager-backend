const play = require('./play');
const { player } = require('./play');
const exec = require('./exec-promisified');

describe('play', () => {
  it('player should be installed', () => {
    try {
      const help = exec(`${player} --help`);
      expect(!!help).toBe(true);
    } catch (err) {
      expect('should not throw').toBe(true);
    }
  });

  it('should throw, if file doesn exist', async () => {
    try {
      await play('foo');
      expect('should throw').toBe(true);
    } catch ({ message }) {
      expect(/Command failed/iu.test(message)).toBe(true);
      expect(/No such file or directory/iu.test(message)).toBe(true);
    }
  });
});
