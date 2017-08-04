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

const _passwd = require('passwd-linux');
const _userid = require('userid');
const _settings = require('./../../core/settings.js');
const _utils = require('./../../lib/utils.js');

const Authenticator = require('./../authenticator.js');

class ShadowAuthenticator extends Authenticator {

  login(data) {
    return new Promise((resolve, reject) => {
      _passwd.checkPass(data.username, data.password, (err, res) => {
        if ( !err && res !== 'passwordCorrect' ) {
          err = 'Invalid credentials';
        }

        if ( err ) {
          reject(err);
        } else {
          resolve({
            id: _userid.uid(data.username),
            username: data.username,
            name: data.username,
            groups: [] // TODO
          });
        }
      });
    });
  }

  getBlacklist(user) {
    const config = _settings.get();
    const path = config.modules.auth.shadow.blacklist;
    return new Promise((resolve) => {
      _utils.readUserMap(user.username, path, resolve);
    });
  }
}

module.exports = new ShadowAuthenticator();

