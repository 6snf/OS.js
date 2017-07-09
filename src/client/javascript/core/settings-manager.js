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
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
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

'use strict';

/**
 * @module core/settings-manager
 */

const SettingsFragment = require('helpers/settings-fragment.js');

/**
 * Settings Manager Class
 *
 * @summary Used for managing Settings across all applications and modules.
 *
 * @constructor
 * @see helpers/event-handler~EventHandler
 * @see core/settings-manager~SettingsManager
 */
let SettingsManager = {
  storage: {},
  defaults: {},
  watches: []
};

/**
 * Initialize SettingsManager.
 * This is run when a user logs in. It will give saved data here
 *
 * @param {Object}    settings      Entire settings tree
 */
SettingsManager.init = function(settings) {
  this.storage = settings || {};
};

/**
 * Gets either the full tree or tree entry by key
 *
 * @param  {String}     pool      Name of settings pool
 * @param  {String}     [key]     Key entry of tree
 *
 * @return  {Mixed}
 */
SettingsManager.get = function(pool, key) {
  try {
    if ( this.storage[pool] && Object.keys(this.storage[pool]).length ) {
      return key ? this.storage[pool][key] : this.storage[pool];
    }

    return key ? this.defaults[pool][key] : this.defaults[pool];
  } catch ( e ) {
    console.warn('SettingsManager::get()', 'exception', e, e.stack);
  }

  return false;
};

/**
 * Sets either full tree or a tree entry by key
 *
 * @param  {String}     pool                  Name of settings pool
 * @param  {String}     [key]                 Key entry of tree
 * @param  {Mixed}      value                 The value (or entire tree if no key given)
 * @param  {Mixed}      [save]                boolean or callback function for saving
 * @param  {Boolean}    [triggerWatch=true]   trigger change event for watchers
 *
 * @return  {Boolean}
 */
SettingsManager.set = function(pool, key, value, save, triggerWatch) {
  try {
    if ( key ) {
      if ( typeof this.storage[pool] === 'undefined' ) {
        this.storage[pool] = {};
      }
      if ( (['number', 'string']).indexOf(typeof key) >= 0 ) {
        this.storage[pool][key] = value;
      } else {
        console.warn('SettingsManager::set()', 'expects key to be a valid iter, not', key);
      }
    } else {
      this.storage[pool] = value;
    }
  } catch ( e ) {
    console.warn('SettingsManager::set()', 'exception', e, e.stack);
  }

  if ( save ) {
    this.save(pool, save);
  }

  if ( typeof triggerWatch === 'undefined' || triggerWatch === true ) {
    this.changed(pool);
  }

  return true;
};

/**
 * Saves the storage to a location
 *
 * @param  {String}     pool      Name of settings pool
 * @param  {Function}   callback  Callback
 */
SettingsManager.save = function(pool, callback) {
  console.debug('SettingsManager::save()', pool, this.storage);
  if ( typeof callback !== 'function' ) {
    callback = function() {};
  }

  const storage = require('core/storage.js');
  storage.saveSettings(pool, this.storage, callback);
};

/**
 * Sets the defaults for a specific pool
 *
 * @param  {String}     pool       Name of settings pool
 * @param  {Object}     [defaults] Default settings tree
 */
SettingsManager.defaults = function(pool, defaults) {
  this.defaults[pool] = defaults;
};

/**
 * Creates a new proxy instance
 *
 * @param  {String}     pool       Name of settings pool
 * @param  {Object}     [defaults] Default settings tree
 *
 * @return {Object}
 */
SettingsManager.instance = function(pool, defaults) {
  if ( !this.storage[pool] || (this.storage[pool] instanceof Array) ) {
    this.storage[pool] = {};
  }

  const instance = new SettingsFragment(this.storage[pool], pool);
  if ( arguments.length > 1 ) {
    SettingsManager.defaults(pool, defaults);
    instance.mergeDefaults(defaults);
  }

  return instance;
};

/**
 * Destroy a watcher
 *
 * @param  {Number}    index     The index from watch()
 */
SettingsManager.unwatch = function(index) {
  if ( typeof this.watches[index] !== 'undefined' ) {
    delete this.watches[index];
  }
};

/**
 * Receive events when a pool changes.
 *
 * @param  {String}     pool      Name of settings pool
 * @param  {Function}   callback  Callback
 *
 * @return {Mixed}                false on error, index for unwatch() otherwise
 */
SettingsManager.watch = function(pool, callback) {
  if ( !this.storage[pool] ) {
    return false;
  }

  const index = this.watches.push({
    pool: pool,
    callback: callback
  });

  return index - 1;
};

/**
 * Notify the SettingsManager that somewhere in a pool's tree it has changed.
 *
 * @param  {String}     pool      Name of settings pool that changed
 *
 * @return {OSjs.Core.SettingsManager}      this
 */
SettingsManager.changed = function(pool) {
  this.watches.forEach((watch) => {
    if ( watch && watch.pool === pool ) {
      watch.callback(this.storage[pool]);
    }
  });

  return this;
};

/**
 * Clears a pool
 *
 * @param  {String}     pool        Name of settings pool
 * @param  {Mixed}      [save=true] Boolean or callback function for saving
 *
 * @return {OSjs.Core.SettingsManager}      this
 */
SettingsManager.clear = function(pool, save) {
  save = (typeof save === 'undefined') || (save === true);
  this.set(pool, null, {}, save);
  return this;
};

/////////////////////////////////////////////////////////////////////////////
// EXPORTS
/////////////////////////////////////////////////////////////////////////////

module.exports = SettingsManager;

