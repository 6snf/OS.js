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
import FileMetadata from 'vfs/file';
import Process from 'core/process';
import * as FS from 'utils/fs';
import * as Compability from 'utils/compability';
import {getConfig} from 'core/config';

/**
 * Get path to css theme
 *
 * @param   {String}    name    CSS Stylesheet name (without extension)
 *
 * @return  {String}            The absolute URL of css file
 */
export function getThemeCSS(name) {
  let root = getConfig('Connection.RootURI', '/');
  if ( name === null ) {
    return root + 'blank.css';
  }

  root = getConfig('Connection.ThemeURI');
  return root + '/' + name + '.min.css';
}

/**
 * Default method for getting a icon from theme
 *
 * @param   {String}    name          Resource filename
 * @param   {String}    [size=16x16]  Icon size
 *
 * @return  {String}            The absolute URL to the resource
 */
export function getIcon(name, size) {
  name = name || '';
  size = size || '16x16';

  if ( arguments.length > 2 ) {
    console.warn('Called getIcon() with deprecated arguments', name);
  }

  if ( !name.match(/^(https?)?:?\//) ) {
    const root = getConfig('Connection.IconURI');
    const theme = document.body.getAttribute('data-icon-theme') || 'default';

    return root + '/' + theme + '/' + size + '/' + name;
  }

  return name;
}

/**
 * Get a icon based in file and mime
 *
 * @param   {File}      file            File Data (see supported types)
 * @param   {String}    [size=16x16]    Icon size
 * @param   {String}    [icon]          Default icon
 *
 * @return  {String}            The absolute URL to the icon
 */
export function getFileIcon(file, size, icon) {
  icon = icon || 'mimetypes/text-x-preview.png';

  if ( typeof file === 'object' && !(file instanceof FileMetadata) ) {
    file = new FileMetadata(file);
  }

  if ( !file.filename ) {
    throw new Error('Filename is required for getFileIcon()');
  }

  const map = [
    {match: 'application/pdf', icon: 'mimetypes/x-office-document.png'},
    {match: 'application/zip', icon: 'mimetypes/package-x-generic.png'},
    {match: 'application/x-python', icon: 'mimetypes/text-x-script.png'},
    {match: 'application/x-lua', icon: 'mimetypes/text-x-script.png'},
    {match: 'application/javascript', icon: 'mimetypes/text-x-script.png'},
    {match: 'text/html', icon: 'mimetypes/text-html.png'},
    {match: 'text/xml', icon: 'mimetypes/text-html.png'},
    {match: 'text/css', icon: 'mimetypes/text-x-script.png'},

    {match: 'osjs/document', icon: 'mimetypes/x-office-document.png'},
    {match: 'osjs/draw', icon: 'mimetypes/image-x-generic.png'},

    {match: /^text\//, icon: 'mimetypes/text-x-generic.png'},
    {match: /^audio\//, icon: 'mimetypes/audio-x-generic.png'},
    {match: /^video\//, icon: 'mimetypes/video-x-generic.png'},
    {match: /^image\//, icon: 'mimetypes/image-x-generic.png'},
    {match: /^application\//, icon: 'mimetypes/application-x-executable.png'}
  ];

  if ( file.type === 'dir' ) {
    icon = 'places/folder.png';
  } else if ( file.type === 'trash' ) {
    icon = 'places/user-trash.png';
  } else if ( file.type === 'application' ) {
    const appname = FS.filename(file.path);
    const meta = PackageManager.getPackage(appname);

    if ( meta ) {
      if ( !meta.icon.match(/^((https?:)|\.)?\//) ) {
        return getIcon(meta.icon, size);
      }
      return getPackageResource(appname, meta.icon);
    }
  } else {
    const mime = file.mime || 'application/octet-stream';

    map.every((iter) => {
      let match = false;
      if ( typeof iter.match === 'string' ) {
        match = (mime === iter.match);
      } else {
        match = mime.match(iter.match);
      }

      if ( match ) {
        icon = iter.icon;
        return false;
      }

      return true;
    });
  }

  return getIcon(icon, size);
}

/**
 * Default method for getting a resource from current theme
 *
 * @param   {String}    name    Resource filename
 * @param   {String}    type    Type ('base' or a sub-folder)
 *
 * @return  {String}            The absolute URL to the resource
 */
export function getThemeResource(name, type) {
  name = name || null;
  type = type || null;

  const root = getConfig('Connection.ThemeURI');

  function getName(str, theme) {
    if ( !str.match(/^\//) ) {
      if ( type === 'base' || type === null ) {
        str = root + '/' + theme + '/' + str;
      } else {
        str = root + '/' + theme + '/' + type + '/' + str;
      }
    }
    return str;
  }

  if ( name ) {
    const theme = document.body.getAttribute('data-theme') || 'default';
    name = getName(name, theme);
  }

  return name;
}

/**
 * Default method for getting a sound from theme
 *
 * @param   {String}    name    Resource filename
 *
 * @return  {String}            The absolute URL to the resource
 */
export function getSound(name) {
  name = name || null;
  if ( name ) {
    const theme = document.body.getAttribute('data-icon-theme') || 'default';
    const root = getConfig('Connection.SoundURI');
    const compability = Compability.getCompability();

    if ( !name.match(/^\//) ) {
      let ext = 'oga';
      if ( !compability.audioTypes.ogg ) {
        ext = 'mp3';
      }
      name = root + '/' + theme + '/' + name + '.' + ext;
    }
  }
  return name;
}

/**
 * Global function for playing a sound
 *
 * @param   {String}      name      Sound name
 * @param   {Number}      volume    Sound volume (0.0 - 1.0)
 *
 * @return {Audio}
 */
export function playSound(name, volume) {
  const compability = Compability.getCompability();
  const wm = require('core/windowmanager.js').instance; // FIXME
  const filename = wm ? wm.getSoundFilename(name) : null;

  if ( !wm || !compability.audio || !wm.getSetting('enableSounds') || !filename ) {
    console.debug('API::playSound()', 'Cannot play sound!');
    return false;
  }

  if ( typeof volume === 'undefined' ) {
    volume = 1.0;
  }

  const f = getSound(filename);
  console.debug('API::playSound()', name, filename, f, volume);

  const a = new Audio(f);
  a.volume = volume;
  a.play();
  return a;
}

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
