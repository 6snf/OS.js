
const _request = require('request');
const _path = require('path');

///////////////////////////////////////////////////////////////////////////////
// HELPERS
///////////////////////////////////////////////////////////////////////////////

function createReadStream(http, path) {
  return new Promise((resolve, reject) => {
    resolve(_request.get(path));
  });
}

function createWriteStream(http, path) {
  return new Promise((resolve, reject) => {
    reject('Unavailable');
  });
}

///////////////////////////////////////////////////////////////////////////////
// VFS METHODS
///////////////////////////////////////////////////////////////////////////////

const VFS = {
  read: function(http, args, resolve, reject) {
    const options = args.options || {};

    function createRequest(path) {
      return new Promise((yes, no) => {
        _request(path).on('response', (response) => {
          const size = response.headers['content-length'];
          const mime = response.headers['content-type'];
          const data = response.body;

          if ( response.statusCode < 200 || response.statusCode >= 300 ) {
            no('Failed to fetch file: ' + response.statusCode);
          } else {
            yes({mime, size, data});
          }

        }).on('error', no);
      });
    }

    if ( options.raw !== false ) {
      if ( options.stream !== false ) {
        _request.head(args.path).on('response', (response) => {
          const size = response.headers['content-length'];
          const mime = response.headers['content-type'];

          if ( response.statusCode < 200 || response.statusCode >= 300 ) {
            reject('Failed to fetch file: ' + response.statusCode);
          } else {
            resolve({
              resource: () => createReadStream(http, args.path),
              mime: mime,
              size: size,
              filename: args.path
            });
          }
        }).on('error', reject);
      } else {
        createRequest(args.path).then((result) => {
          resolve({raw: result.data, mime: result.mime, size: result.size, filename: _path.basename(args.path)});
        }).catch(reject);
      }
    } else {
      createRequest(args.path).then((result) => {
        const enc = 'data:' + result.mime + ';base64,' + (new Buffer(result.data).toString('base64'));
        resolve(enc.toString());
      }).catch(reject);
    }
  }
};

///////////////////////////////////////////////////////////////////////////////
// EXPORTS
///////////////////////////////////////////////////////////////////////////////

module.exports.request = function(http, method, args) {
  return new Promise((resolve, reject) => {
    if ( typeof VFS[method] === 'function' ) {
      VFS[method](http, args, resolve, reject);
    } else {
      reject('No such VFS method');
    }
  });
};

module.exports.createReadStream = createReadStream;
module.exports.createWriteStream = createWriteStream;
module.exports.name = 'HTTP';

