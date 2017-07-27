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
const settings = require('./../settings.js');
const vfs = require('./../vfs.js');

/**
 * Base Authenticator Class
 */
class Authenticator {

  /**
   * Registers the module
   * @param {Object} config Configuration
   * @return {Promise<Boolean, Error>}
   */
  register(config) {
    return Promise.resolve(true);
  }

  /**
   * Destroys the module
   * @return {Promise<Boolean, Error>}
   */
  destroy() {
    return Promise.resolve(true);
  }

  /**
   * Login API request
   * @param {ServerObject} http The HTTP object
   * @param {Object} data Login data
   * @return {Promise<Boolean, Error>}
   */
  login(http, data) {
    return Promise.reject('Not implemented');
  }

  /**
   * Logout API request
   * @param {ServerObject} http The HTTP object
   * @return {Promise<Boolean, Error>}
   */
  logout(http) {
    return Promise.resolve(true);
  }

  /**
   * Manage API request
   * @param {ServerObject} http The HTTP object
   * @param {String} command The manage command
   * @param {Object} args Command arguments
   * @return {Promise<Boolean, Error>}
   */
  manage(http, command, args) {
    return Promise.reject('Not implemented');
  }

  /**
   * Checks for given permission
   * @param {ServerObject} http The HTTP object
   * @param {String} type The group
   * @param {Object} [options] Options
   * @return {Promise<Boolean, Error>}
   */
  checkPermission(http, type, options) {
    options = options || {};

    return new Promise((resolve, reject) => {
      this.checkSession(http).then(() => {
        // Only check types that are defined in the map
        const maps = settings.get('api.groups');
        if ( typeof maps[type] !== 'undefined' ) {
          type = maps[type];
        } else {
          if ( type !== 'fs' ) {
            resolve(true);
            return true;
          }
        }

        return this._getGroups(http).then((groups) => {
          const found = Authenticator.hasGroup(groups, [type]);

          if ( found ) {
            if ( type === 'fs' ) {
              this.checkFilesystemPermission(http, options.src, options.dest, options.method)
                .then((result) => {
                  if ( result ) {
                    return resolve(true);
                  } else {
                    return reject('Permission denied for: ' + type + ', ' + options.method);
                  }
                }).catch(reject);

              return true;
            }
          } else {
            return reject('Permission denied for: ' + type);
          }

          return resolve(true);
        }).catch(reject);
      }).catch(reject);
    });
  }

  /**
   * Checks for given filesystem permission
   * @param {ServerObject} http The HTTP object
   * @param {String} src Source file path
   * @param {String} [dest] Destination file path
   * @param {String} method The VFS method
   * @return {Promise<Boolean, Error>}
   */
  checkFilesystemPermission(http, src, dest, method) {
    const mountpoints = settings.get('vfs.mounts') || {};
    const groups = settings.get('vfs.groups') || {};

    const _checkMount = (p, d, userGroups) => {
      const parsed = vfs.parseVirtualPath(p, http);
      const mount = mountpoints[parsed.protocol];
      const map = d ? ['upload', 'write', 'delete', 'copy', 'move', 'mkdir'] : ['upload', 'write', 'delete', 'mkdir'];

      if ( typeof mount === 'object' ) {
        if ( mount.enabled === false || (mount.ro === true && map.indexOf(method) !== -1) ) {
          return false;
        }
      }

      if ( groups[parsed.protocol] ) {
        if ( !Authenticator.hasGroup(userGroups, groups[parsed.protocol]) ) {
          return false;
        }
      }

      return true;
    };

    return new Promise((resolve, reject) => {
      this._getGroups(http).then((userGroups) => {
        const srcCheck = src ? _checkMount(src, false, userGroups) : true;
        const dstCheck = dest ? _checkMount(dest, true, userGroups) : true;

        return resolve(srcCheck && dstCheck);
      }).catch(reject);
    });

  }

  /**
   * Checks if user has permission to package
   * @param {ServerObject} http The HTTP object
   * @param {String} name Package name
   * @return {Promise<Boolean, Error>}
   */
  checkPackagePermission(http, name) {
    return new Promise((resolve, reject) => {
      this.checkSession(http).then(() => {
        this.getBlacklist(http, http.session.get('username')).then((blacklist) => {
          return blacklist.indexOf(name) === -1 ? resolve(true) : reject('Blacklisted package');
        }).catch(reject);
      }).catch(reject);
    });
  }

  /**
   * Checks if user has session
   * @param {ServerObject} http The HTTP object
   * @return {Promise<Boolean, Error>}
   */
  checkSession(http) {
    return new Promise((resolve, reject) => {
      if ( http.session.get('username') ) {
        resolve(true);
      } else {
        reject('You have no OS.js Session, please log in!');
      }
    });
  }

  /**
   * Gets groups of a user
   * @param {ServerObject} http The HTTP object
   * @param {String} username The username
   * @return {Promise<Array, Error>}
   */
  getGroups(http, username) {
    return Promise.resolve([]);
  }

  /**
   * Gets package blacklists of a user
   * @param {ServerObject} http The HTTP object
   * @param {String} username The username
   * @return {Promise<Array, Error>}
   */
  getBlacklist(http, username) {
    return Promise.resolve([]);
  }

  /**
   * Sets package blacklists of a user
   * @param {ServerObject} http The HTTP object
   * @param {String} username The username
   * @param {Array} list The blacklist
   * @return {Promise<Boolean, Error>}
   */
  setBlacklist(http, username, list) {
    return Promise.resolve(true);
  }

  /**
   * Wrapper for getting groups
   * @param {ServerObject} http The HTTP object
   * @return {Promise<String[], Error>}
   */
  _getGroups(http) {
    return new Promise((resolve, reject) => {
      this.getGroups(http, http.session.get('username')).then((groups) => {
        if ( !(groups instanceof Array) || !groups.length ) {
          groups = settings.get('api.defaultGroups') || [];
        }
        return resolve(groups);
      }).catch(reject);
    });
  }

  /**
   * Checks if user has given group(s)
   *
   * @param   {Array}            userGroups    User groups
   * @param   {String|Array}     groupList     Group(s)
   * @param   {Boolean}          [all=true]    Check if all and not some
   *
   * @function hasGroup
   * @return {Promise}
   */
  static hasGroup(userGroups, groupList, all) {
    if ( !(groupList instanceof Array) ) {
      groupList = [];
    }

    if ( !groupList.length ) {
      return true;
    }

    if ( userGroups.indexOf('admin') !== -1 ) {
      return true;
    }

    if ( !(groupList instanceof Array) ) {
      groupList = [groupList];
    }

    const m = (typeof all === 'undefined' || all) ? 'every' : 'some';
    return groupList[m]((name) => {
      if ( userGroups.indexOf(name) !== -1 ) {
        return true;
      }

      return false;
    });
  }

}

module.exports = Authenticator;
