const { promisify } = require('node:util');
const { exec } = require('node:child_process');

module.exports = promisify(exec);
// const exec = async (cmd) => new Promise((resolve, reject) => {
//   nodeExec(cmd, (err, stdout, stderr) => {
//     if (err) {
//       reject(err);
//       return;
//     }

//     resolve({ stdout });
//   });
// });

// export default exec;
