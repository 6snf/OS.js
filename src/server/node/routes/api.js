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
const packagemanager = require('./../packagemanager.js');
const modules = require('./../modules.js');
const settings = require('./../settings.js');

module.exports = function(app, wrapper) {
  const authenticator = () => modules.getAuthenticator();
  const storage = () => modules.getStorage();

  /*
   * Login attempts
   */
  wrapper.post('/API/login', (http) => {

    const errored = (error) => http.response.json({error});

    authenticator().login(http, http.data)
      .then((user) => {

        authenticator().getBlacklist(http, http.data.username).then((blacklist) => {
          return storage().getSettings(http, http.data.username).then((settings) => {
            const getGroups = user.groups
              ? Promise.resolve(user.groups)
              : authenticator().getGroups(http, http.data.username);

            return getGroups.then((groups) => {
              http.session.set('username', http.data.username);
              http.setActiveUser(http.request, true);

              user.groups = groups;

              return http.response.json({result: {
                userData: user,
                userSettings: settings,
                blacklistedPackages: blacklist
              }});
            }).catch(errored);

          }).catch(errored);
        }).catch(errored);
      }).catch(errored);
  });

  /*
   * Logout attempts
   */
  wrapper.post('/API/logout', (http) => {
    authenticator().logout(http)
      .then((result) => {
        http.session.set('username', null);
        http.setActiveUser(http.request, false);

        return http.response.json({result});
      })
      .catch((error) => http.response.json({error}));
  });

  /*
   * Package operations
   */
  wrapper.post('/API/packages', (http) => {
    const command = http.data.command;
    const args = http.data.args || {};

    authenticator().checkPermission(http, 'packages').then(() => {
      if ( packagemanager[command] ) {
        packagemanager[command](args)
          .then((result) => http.response.json({result}))
          .catch((error) => http.response.json({error}));
      } else {
        http.response.json({error: 'No such command'});
      }
    }).catch((error) => http.response.status(403).json({error}));
  });

  /*
   * Application operations
   */
  wrapper.post('/API/application', (http) => {
    const apath = http.data.path || null;
    const ameth = http.data.method || null;
    const aargs = http.data.args || {};

    authenticator().checkPermission(http, 'application').then(() => {
      let module;
      try {
        module = require(modules.getPackageEntry(apath));
      } catch ( e ) {
        console.warn(e);
      }

      if ( module ) {
        if ( typeof module.api[ameth] === 'function' ) {
          module.api[ameth](settings.option(), http, (result) => {
            http.response.json({result});
          }, (error) => {
            http.response.json({error});
          }, aargs);
        } else {
          http.response.json({error: 'No such API method: ' + ameth});
        }
      } else {
        http.response.json({error: 'Failed to load Application API for: ' + apath});
      }
    }).catch((error) => http.response.status(403).json({error}));
  });

  /*
   * Settings operations
   */
  wrapper.post('/API/settings', (http) => {
    const username = http.session.get('username');
    const settings = http.data.settings;
    authenticator().checkSession(http).then(() => {
      storage().setSettings(http, username, settings)
        .then((result) => http.response.json({result}))
        .catch((error) => http.response.json({error}));
    }).catch((error) => http.response.status(403).json({error}));
  });

  /*
   * Users operations
   */
  wrapper.post('/API/users', (http) => {
    const command = http.data.command;
    const args = http.data.user || {};

    authenticator().checkPermission(http, 'users').then(() => {
      authenticator().manage(http, command, args)
        .then((result) => http.response.json({result}))
        .catch((error) => http.response.json({error}));
    }).catch((error) => http.response.status(403).json({error}));
  });

};
