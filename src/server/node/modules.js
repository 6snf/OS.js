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

const path = require('path');
const fs = require('fs-extra');
const glob = require('glob-promise');
const settings = require('./settings.js');
const colors = require('colors');
const child_process = require('child_process');

const log = function() {
  if ( settings.option('LOGLEVEL') ) {
    console.log(...arguments);
  }
};

/**
 * Base Modules Class
 */
class Modules {

  /**
   * Creates a new instance
   */
  constructor() {
    this.destroyed = false;
    this.spawners = [];
    this.metadata = {};
    this.instances = {
      vfs: [],
      services: [],
      authenticator: null,
      storage: null,
      session: null
    };
  }

  /**
   * Destroys all loaded modules
   * @return {Promise}
   */
  destroy() {
    if ( this.destroyed ) {
      return Promise.resolve(true);
    }

    this.destroyed = true;

    const modules = [
      this.getAuthenticator(),
      this.getStorage()
    ].concat(this.instances.services.map((m) => {
      return m && m.destroy ? m.destroy() : Promise.resolve(true);
    }));

    console.log('Destroying', this.spawners.length, 'spawners');

    this.spawners.forEach((c) => {
      if ( c && typeof c.kill === 'function' ) {
        c.kill();
      }
    });

    console.log('Destroying', modules.length, 'modules');

    return Promise.each(modules, (module) => {
      return module ? module.destroy() : Promise.resolve(true);
    });
  }

  /**
   * Gets the loaded Session module
   * @return {Object}
   */
  getSession() {
    return this.instances.session;
  }

  /**
   * Gets the loaded Authenticator module
   * @return {Authenticator}
   */
  getAuthenticator() {
    return this.instances.authenticator;
  }

  /**
   * Gets the loaded Storage module
   * @return {Storage}
   */
  getStorage() {
    return this.instances.storage;
  }

  /**
   * Gets a package entry file
   * @param {String} name Package name
   * @return {String}
   */
  getPackageEntry(name) {
    const manifest = this.metadata[name];
    if ( manifest ) {
      let filename = 'api.js';
      if ( manifest.main ) {
        if ( typeof manifest.main === 'string' ) {
          filename = manifest.main;
        } else {
          filename = manifest.main.node;
        }
      }

      const root = settings.option('ROOTDIR');
      const main = path.join(root, manifest._src, filename);
      return fs.existsSync(main) ? main : null;
    }

    return null;
  }

  /**
   * Gets a VFS module by name
   * @param {String} name Name
   * @return {Object}
   */
  getVFS(name) {
    return this.instances.vfs.find((iter) => {
      return iter && iter.name === name;
    });
  }

  /**
   * Loads a file
   * @param {String} key Type of file
   * @param {String} filename Filename
   * @return {Promise<Boolean, Error>}
   */
  loadFile(key, filename) {
    return new Promise((resolve, reject) => {
      log(colors.bold('Loading'), colors.green(key), filename);

      let instance;
      try {
        instance = require(filename);
      } catch ( e ) {
        reject(e);
        return;
      }

      instance.register().then((res) => {
        this.instances[key] = instance;

        return instance.register().then(() => resolve(instance)).catch(reject);
      }).catch(reject);
    });
  }

  _loadDirectory(directory) {
    return new Promise((resolve, reject) => {
      glob(directory + '/*.js').then((files) => {
        return resolve(files);
      }).catch(reject);
    });
  }

  /**
   * Loads a directory
   * @param {String} type Type
   * @param {String} directory Directory
   * @param {Object} app The express app
   * @param {Object} wrapper Our express wrapper layer
   * @param {Function} [loader] The loader
   * @return {Promise<Boolean, Error>}
   */
  loadDirectory(type, directory, app, wrapper, loader) {
    loader = loader || function(files) {
      return new Promise((resolve, reject) => {
        files.forEach((f) => {
          log(colors.bold('Loading'), colors.green(type), f);

          try {
            require(f)(app, wrapper);
          } catch ( e ) {
            console.error(e);
          }
        });
        resolve(true);
      });
    };

    return new Promise((resolve, reject) => {
      this._loadDirectory(directory).then((files) => {
        return loader(files).then(resolve).catch(reject);
      }).catch(reject);
    });
  }

  /**
   * Loads all modules
   * @param {Object} app The express app
   * @param {Object} wrapper Our express wrapper layer
   * @return {Promise<Boolean, Error>}
   */
  load(app, wrapper) {
    const metaPath = path.resolve(settings.option('SERVERDIR'), 'packages.json');
    this.metadata = fs.readJsonSync(metaPath);

    return Promise.each([
      this.loadRoutes,
      this.loadVFS,
      this.loadMiddleware,
      this.loadServices,
      this.loadPackages,
      this.loadAuthenticator,
      this.loadStorage
    ], (fn) => {
      return fn.call(this, app, wrapper);
    });
  }

  /**
   * Loads session module
   * @param {Object} session Express session layer
   * @return {Object}
   */
  loadSession(session) {
    if ( !this.instances.session ) {
      const name = settings.get('http.session.module');
      const options = settings.get('http.session.options.' + name) || {};
      log(colors.bold('Loading'), colors.green('session'), name);

      if ( name === 'memory' ) {
        console.warn('WARNING: Using memory module might lead to unwanted and buggy behavior');
        this.instances.session = new session.MemoryStore(options);
      } else {
        const Store = require(name)(session);
        this.instances.session = new Store(options);
      }
    }

    return this.instances.session;
  }

  /**
   * Loads all routes
   * @param {Object} app The express app
   * @param {Object} wrapper Our express wrapper layer
   * @return {Promise<Boolean, Error>}
   */
  loadRoutes(app, wrapper) {
    const routeFolder = path.resolve(__dirname, 'routes');
    return this.loadDirectory('route', routeFolder, app, wrapper);
  }

  /**
   * Loads all middleware
   * @param {Object} app The express app
   * @param {Object} wrapper Our express wrapper layer
   * @return {Promise<Boolean, Error>}
   */
  loadMiddleware(app, wrapper) {
    if ( settings.option('MOCHA') ) {
      return Promise.resolve(true);
    }

    return Promise.each(this.getModulePaths('middleware'), (dir) => {
      return this.loadDirectory('middleware', dir, app, wrapper);
    });
  }

  /**
   * Loads all services
   * @param {Object} app The express app
   * @param {Object} wrapper Our express wrapper layer
   * @return {Promise<Boolean, Error>}
   */
  loadServices(app, wrapper) {
    if ( settings.option('MOCHA') ) {
      return Promise.resolve(true);
    }

    return Promise.each(this.getModulePaths('services'), (dir) => {
      return this.loadDirectory('middleware', dir, app, wrapper, (files) => {
        return Promise.each(files, (f) => {
          log(colors.bold('Loading'), colors.green('service'), f);

          const m = require(f).register(settings.option(), settings.get(), wrapper);
          this.instances.services.push(m);
        });
      });
    });
  }

  /**
   * Loads all packages
   * @param {Object} app The express app
   * @param {Object} wrapper Our express wrapper layer
   * @return {Promise<Boolean, Error>}
   */
  loadPackages(app, wrapper) {
    if ( settings.option('MOCHA') ) {
      return Promise.resolve(true);
    }

    const launchSpawners = (cwd, metadata) => {
      if ( metadata.spawn && metadata.spawn.enabled !== false ) {
        const spawner = path.resolve(cwd, metadata.spawn.exec);
        const args = metadata.spawn.args || [];

        log(colors.bold('Spawning'), colors.green('node'), spawner);

        const proc = child_process.fork(spawner, args, {
          silent: !settings.option('DEBUG'),
          cwd: cwd
        });

        proc.on('error', (err) => console.error(metadata.path, 'error', err));
        proc.on('exit', (code) => console.debug(metadata.path, 'exited', code));
        this.spawners.push(proc);
      }
    };

    const options = settings.option();
    return Promise.each(Object.keys(this.metadata), (name) => {
      const meta = this.metadata[name];
      const filename = path.resolve(options.ROOTDIR, meta._src);

      let result;
      try {
        const main = this.getPackageEntry(name);
        if ( main !== null ) {
          log(colors.bold('Loading'), colors.green(meta.type), main);

          const pkg = require(main);
          if ( meta.type === 'extension' ) {
            launchSpawners(filename, meta);
          } else {
            result = pkg.register(options, meta, {
              http: wrapper.getServer(),
              ws: wrapper.getWebsocket(),
              proxy: wrapper.getProxy()
            });
          }
        }
      } catch ( e ) {
        console.warn(e);
      }

      return result instanceof Promise ? result : Promise.resolve(false);
    });
  }

  /**
   * Loads configured Authenticator
   * @return {Promise<Boolean, Error>}
   */
  loadAuthenticator() {
    const name = settings.get('authenticator');

    return new Promise((resolve, reject) => {
      const f = this.getModuleFile('auth', name);
      if ( f ) {
        this.loadFile('authenticator', f).then(resolve).catch(reject);
      } else {
        reject('No such module');
      }
    });
  }

  /**
   * Loads configured Storage
   * @return {Promise<Boolean, Error>}
   */
  loadStorage() {
    const name = settings.get('storage');

    return new Promise((resolve, reject) => {
      const f = this.getModuleFile('storage', name);
      if ( f ) {
        this.loadFile('storage', f).then(resolve).catch(reject);
      } else {
        reject('No such module');
      }
    });
  }

  /**
   * Loads VFS modules
   * @return {Promise<Boolean, Error>}
   */
  loadVFS() {
    return Promise.each(this.getModulePaths('vfs'), (dir) => {
      return new Promise((resolve, reject) => {
        this._loadDirectory(dir).then((files) => {
          files.forEach((f) => {
            log(colors.bold('Loading'), colors.green('transport'), f);
            try {
              this.instances.vfs.push(require(f));
            } catch ( e ) {
              console.error(e);
            }
          });

          return resolve(true);
        }).catch(reject);
      });
    });
  }

  getModuleFile(folder, name) {
    const dirs = this.getModulePaths(folder);
    const found = dirs.map((f) => {
      return path.resolve(f, name + '.js');
    }).filter((f) => fs.existsSync(f));

    return found.length ? found[0] : null;
  }

  getModulePaths(folder) {
    const overlays = settings.get('overlays', []);
    const root = settings.option('ROOTDIR');
    const base = [
      path.resolve(__dirname, 'modules', folder)
    ];

    return base.concat(overlays.map((o) => {
      return path.resolve(root, o, 'server/node/modules', folder);
    })).filter((f) => fs.existsSync(f));
  }

}

module.exports = (new Modules());
