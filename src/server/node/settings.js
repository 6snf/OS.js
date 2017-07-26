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
const simplejsonconf = require('simplejsonconf');
const path = require('path');
const fs = require('fs-extra');

/**
 * Base Settings Class
 */
class Settings {

  /**
   * Loads and registers all settings
   * @param {Object} argv Launch arguments
   * @param {Object} opts Options
   * @param {Object} external Options from external scripts
   */
  load(argv, opts, external) {
    opts = opts || {};
    external = external || {};

    const argvOptions = {
      DEBUG: argv.debug,
      HOSTNAME: argv.h || argv.hostname,
      ROOT: argv.r || argv.root,
      PORT: argv.p || argv.port,
      LOGLEVEL: argv.l || argv.loglevel,
      AUTH: argv.authenticator,
      STORAGE: argv.storage
    };

    Object.keys(argvOptions).forEach((k) => {
      if ( argvOptions[k] ) {
        opts[k] = argvOptions[k];
      }
    });

    Object.keys(external).forEach((k) => {
      opts[k] = external[k];
    });

    const filename = path.resolve(opts.SERVERDIR, 'settings.json');
    const data = fs.readFileSync(filename, 'utf-8');

    const safeWords = [
      '%VERSION%',
      '%DROOT%',
      '%UID%',
      '%USERNAME%'
    ];

    // Allow environmental variables to override certain internals in config
    data.match(/%([A-Z0-9_\-]+)%/g).filter((() => {
      let seen = {};
      return function(element, index, array) {
        return !(element in seen) && (seen[element] = 1);
      };
    })()).filter((w) => {
      return safeWords.indexOf(w) === -1;
    }).forEach((w) => {
      const p = w.replace(/%/g, '');
      const u = /^[A-Z]*$/.test(p);
      const v = u ? process.env[p] : null;
      if ( typeof v !== 'undefined' && v !== null ) {
        const re = w.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '$1');
        data = data.replace(new RegExp(re, 'g'), String(v));
      }
    });

    const config = Object.assign({
      api: {},
      vfs: {},
      http: {},
      mimes: {},
      proxies: {},
      modules: {}
    }, JSON.parse(data));

    config.modules = Object.assign({
      auth: {},
      storage: {}
    }, config.modules);

    if ( process.env.SECRET ) {
      config.http.session.secret = process.env.SECRET;
    }

    if ( opts.CONNECTION || process.env.CONNECTION ) {
      config.http.connection = opts.CONNECTION || process.env.CONNECTION;
    }

    if ( opts.AUTH ) {
      config.authenticator = opts.AUTH;
    }
    if ( opts.STORAGE ) {
      config.storage = opts.STORAGE;
    }
    if ( opts.SESSION ) {
      config.http.session.module = opts.SESSION;
    }

    if ( config.tz ) {
      process.env.TZ = config.tz;
    }

    this.settings = Object.freeze(config);
    this.options = opts;
  }

  /**
   * Gets a settings entry
   * @param {String} key The key
   * @param {*} [defaultValue] Default value
   * @return {*}
   */
  get(key, defaultValue) {
    return simplejsonconf.getJSON(this.settings, key, defaultValue);
  }

  /**
   * Gets an option entry
   * @param {String} key The key
   * @return {*}
   */
  option(key) {
    return key ? this.options[key] : this.options;
  }

}

module.exports = (new Settings());
