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
import PackageManager from 'core/package-manager';
import Process from 'core/process';
import * as FS from 'utils/fs';
import {getConfig} from 'core/config';

/**
 * Get package resource
 *
 * @param {Process|String}    app       The application (or package name)
 * @param {String}            name      Resource name
 * @param {String}            vfspath   Return a VFS path
 * @return {String}
 */
export function getPackageResource(app, name, vfspath) {
  if ( name.match(/^((https?:)|\.)?\//) ) {
    return name;
  }
  name = name.replace(/^\.\//, '');

  function getName() {
    let appname = null;

    if ( app instanceof Process ) {
      appname = app.__pname;
    } else if ( typeof app === 'string' ) {
      appname = app;
    }

    return appname;
  }

  function getResultPath(path, userpkg) {
    if ( vfspath ) {
      if ( userpkg ) {
        path = path.substr(getConfig('Connection.FSURI').length);
      } else {
        path = 'osjs:///' + path;
      }
    }

    return path;
  }

  return (() => {
    const appname = getName();
    const pkg = PackageManager.getPackage(appname);

    let path = '';
    if ( pkg ) {
      if ( pkg.scope === 'user' ) {
        path = '/user-package/' + FS.filename(pkg.path) + '/' + name.replace(/^\//, '');
      } else {
        path = 'packages/' + pkg.path + '/' + name;
      }
    }

    return getResultPath(path, pkg.scope === 'user');
  })();
}
