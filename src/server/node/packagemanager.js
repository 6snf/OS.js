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
    }).catch(reject);
  });
};

module.exports.install = function() {
  return Promise.reject('Not yet implemented');
};

module.exports.uninstall = function() {
  return Promise.reject('Not yet implemented');
};

module.exports.update = function() {
  return Promise.reject('Not yet implemented');
};

module.exports.cache = function() {
  return Promise.reject('Not yet implemented');
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
