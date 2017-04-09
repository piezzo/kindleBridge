var path = require('path');
var filepath = path.join(__dirname, '../temp/index.html');

function create() {
  console.log('calling kindlegen');
  return new Promise(function(resolve, reject) {
    const spawn = require('child_process').spawn;
    const kindlegen = spawn('kindlegen', [filepath, '-c2', '-o', 'article.mobi']);
    if (process.env.NODE_ENV === 'development') { //in development mode, show whats happening.
      kindlegen.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
      });
      kindlegen.stderr.on('data', (data) => {
        console.log(`stderr: ${data}`);
      });
    }
    kindlegen.on('close', (code) => {
      console.log(`child process kindlegen exited with code ${code}`);
      if (code <= 1) {
        resolve('done');
      } else {
        reject(`*** child process kindlegen exited with code ${code}`);
      }
    });
  });
}

exports.create = create;
