/*!
 * OS.js - JavaScript Cloud/Web Desktop Platform
 *
 * Copyright (c) 2011-2017, Anders Evenrud <andersevenrud@gmail.com>
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS 'AS IS' AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * @author  Anders Evenrud <andersevenrud@gmail.com>
 * @licence Simplified BSD License
 */
const Promise = require('bluebird');
const fs = require('fs-extra');
const path = require('path');
const settings = require('./settings.js');
const vfs = require('./vfs.js');
const glob = require('glob-promise');
const unzip = require('unzip-stream');

///////////////////////////////////////////////////////////////////////////////
// HELPERS
///////////////////////////////////////////////////////////////////////////////

const readManifestFile = (filename, scope) => {
  return new Promise((resolve, reject) => {
    fs.readJson(filename).then((json) => {
      Object.keys(json).forEach((k) => {
        json[k].scope = scope;
      });
      return resolve(json);
    }).catch(reject);
  });
};

const getSystemMetadata = () => {
  const filename = path.resolve(settings.option('SERVERDIR'), 'packages.json');
  return readManifestFile(filename, 'system');
};

const traversePackageDirectory = (fake, real) => {
  const packages = [];

  const readMetadata = (filename) => {
    return new Promise((yes, no) => {
      fs.readJson(filename).then((json) => {
        json.path = fake + '/' + path.basename(path.dirname(filename));
        return yes(packages.push(json));
      }).catch(no);
    });
  };

  const promise = new Promise((resolve, reject) => {
    glob(path.join(real, '*/metadata.json')).then((files) => {
      return Promise.all(files.map((filename) => readMetadata(filename)))
        .then(resolve).catch(reject);
    }).catch(reject);
  });

  return new Promise((resolve, reject) => {
    promise.then(() => {
      const result = {};

      packages.filter((p) => !!p).forEach((p) => {
        result[p.className] = p;
      });

      resolve(result);
    }).catch(reject);
  });
};

const generateUserMetadata = (username, paths) => {
  return new Promise((resolve, reject) => {
    let result = {};

    Promise.each(paths, (p) => {
      try {
        const parsed = vfs.parseVirtualPath(p, {username});
        return new Promise((yes, no) => {
          traversePackageDirectory(p, parsed.real).then((packages) => {
            result = Object.assign(result, packages);
            return yes();
          }).catch(no);
        });
      } catch ( e ) {
        return Promise.reject('Failed to read user packages');
      }
    }).then(() => {
      const dest = 'home:///.packages/packages.json';
      const parsed = vfs.parseVirtualPath(dest, {username});
      fs.writeJson(parsed.real, result).then(resolve).catch(reject);
      return resolve(result);
    }).catch(reject);
  });
};

const getUserMetadata = (username, paths) => {
  return new Promise((resolve, reject) => {
    let result = {};

    Promise.each(paths, (p) => {
      const filename = [p, 'packages.json'].join('/'); // path.join does not work
      try {
        const parsed = vfs.parseVirtualPath(filename, {username: username});
        return new Promise((yes, no) => {
          readManifestFile(parsed.real, 'user').then((json) => {
            result = Object.assign(result, json);
            return yes(json);
          }).catch(no);
        });
      } catch ( e ) {
        return Promise.reject('Failed to parse user manifest');
      }
    }).then(() => {
      return resolve(result);
    }).catch((e) => {
      console.warn(e);
      resolve(result);
    });
  });
};

const installFromZip = (username, args) => {
  return new Promise((resolve, reject) => {
    vfs.createReadStream(args.zip, {username}).then((zipStream) => {
      /*eslint new-cap: "off"*/
      zipStream.pipe(unzip.Parse()).on('entry', (entry) => {
        const target = [args.dest, entry.path].join('/');
        const targetParent = entry.type === 'Directory' ? target : path.dirname(target);
        const targetRealParent = vfs.parseVirtualPath(targetParent, {username}).real;

        try {
          if ( !fs.existsSync(targetRealParent) ) {
            fs.mkdirSync(targetRealParent);
          }
        } catch ( e  ) {
          console.warn(e);
        }

        vfs.createWriteStream(target, {username}).then((writeStream) => {
          return entry.pipe(writeStream);
        }).catch((e) => {
          console.warn(e);
          entry.autodrain();
        });
      }).on('finish', () => {
        resolve(true);
      }).on('error', reject);
    }).catch(reject);
  });
};

///////////////////////////////////////////////////////////////////////////////
// EXPORTS
///////////////////////////////////////////////////////////////////////////////

module.exports.install = function(http, args) {
  // FIXME: Make totally async
  if ( args.zip && args.dest && args.paths ) {
    return new Promise((resolve, reject) => {
      try {
        const overwrite =  args.overwrite !== false;
        const username = http.session.get('username');
        const realDst = vfs.parseVirtualPath(args.dest, {username}).real;

        const onError = (err) => {
          if ( realDst ) {
            try {
              fs.removeSync(realDst);
            } catch (e) {
              console.warn(e);
            }
          }
          return reject(err);
        };

        const exists = fs.existsSync(realDst);
        if ( exists && !overwrite ) {
          reject('Package already installed');
        } else {
          if ( !exists ) {
            fs.mkdirSync(realDst);
          }

          installFromZip(username, args).then(resolve).catch(onError);
        }
      } catch ( e ) {
        reject(e);
      }
    });
  }

  return Promise.reject('Not enough arguments');
};

module.exports.uninstall = function(http, args) {
  if ( !args.path ) {
    return Promise.reject('Missing path');
  }

  const username = http.session.get('username');

  let result = Promise.reject('Uninstallation failed');

  try {
    const parsed = vfs.parseVirtualPath(args.path, {username: username});
    result = fs.remove(parsed.real);
  } catch ( e ) {
    result = Promise.reject(e);
  }

  return result;
};

module.exports.update = function() {
  return Promise.reject('Not yet implemented');
};

module.exports.cache = function(http, args) {
  const username = http.session.get('username');

  if ( args.action === 'generate' ) {
    if ( args.scope === 'user' ) {
      return generateUserMetadata(username, args.paths);
    }
  }

  return Promise.reject('Not available');
};

module.exports.list = function(http, args) {
  return new Promise((resolve, reject) => {
    const username = http.session.get('username');
    const paths = args.paths;

    getSystemMetadata().then((systemMeta) => {
      return getUserMetadata(username, paths).then((userMeta) => {
        return resolve(Object.assign({}, userMeta, systemMeta));
      }).catch(reject);
    }).catch(reject);
  });
};