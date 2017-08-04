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

class User {

  constructor(uid, username, name, groups) {
    this.id = uid;
    this.username = username;
    this.name = name;

    if ( !(groups instanceof Array) || !groups.length ) {
      groups = settings.get('api.defaultGroups') || [];
    }

    this.groups = groups;
  }

  toJson() {
    return {
      id: this.id,
      username: this.username,
      name: this.name,
      groups: this.groups
    };
  }

  /**
   * Checks if user has given group(s)
   *
   * @param   {String|Array}     groupList     Group(s)
   * @param   {Boolean}          [all=true]    Check if all and not some
   *
   * @return {Boolean}
   */
  hasGroup(groupList, all) {
    if ( !(groupList instanceof Array) ) {
      groupList = [];
    }

    if ( !groupList.length ) {
      return true;
    }

    if ( this.groups.indexOf('admin') !== -1 ) {
      return true;
    }

    if ( !(groupList instanceof Array) ) {
      groupList = [groupList];
    }

    const m = (typeof all === 'undefined' || all) ? 'every' : 'some';
    return groupList[m]((name) => {
      if ( this.groups.indexOf(name) !== -1 ) {
        return true;
      }

      return false;
    });
  }

  static createFromObject(obj) {
    return new User(obj.id, obj.username, obj.name, obj.groups);
  }

}

module.exports = User;
