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
import SettingsManager from 'core/settings-manager';
import {getConfig} from 'core/config';
import * as Compability from 'utils/compability';
import * as Assets from 'core/assets';
import * as DOM from 'utils/dom';
import * as VFS from 'vfs/fs';

/**
 * Theme resource handling
 */
class Theme {

  constructor() {
    this.settings = null;
    this.$themeScript = null;
    this.$animationLink = null;
  }

  init() {
    // FIXME: Defaults from CoreWM ?
    const link = getConfig('Connection.RootURI', '/') + 'blank.css';
    this.setAnimationLink(link);

    this.settings = SettingsManager.instance('__theme__', {
      enableSounds: true,
      styleTheme: 'default',
      soundTheme: 'default',
      iconTheme: 'default',
      sounds: {}
    });
  }

  destroy() {
    this.$themeScript = DOM.$remove(this.$themeScript);
    this.$animationLink = DOM.$remove(this.$animationLink);
  }

  /**
   * Perform an action on current theme
   * @param {String} action Method name
   * @param {Array} args Method arumentgs
   * @return {*}
   */
  themeAction(action, args) {
    args = args || [];
    if ( OSjs.Applications.CoreWM.CurrentTheme ) {
      try {
        return OSjs.Applications.CoreWM.CurrentTheme[action].apply(null, args);
      } catch ( e ) {
        console.warn(e);
      }
    }
    return null;
  }

  /**
   * Set the background
   * @param {Object} settings Settings
   */
  _setBackground(settings) {
    const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
    const typeMap = {
      'image': 'normal',
      'image-center': 'center',
      'image-fill': 'fill',
      'image-strech': 'strech'
    };

    let className = 'color';
    let back = 'none';
    if ( settings.wallpaper && settings.background.match(/^image/) ) {
      back = settings.wallpaper;
      className = typeMap[settings.background] || 'default';
    }

    if ( back !== 'none' ) {
      try {
        VFS.url(back).then((result) => {
          back = 'url(\'' + result + '\')';
          document.body.style.backgroundImage = back;
          return true;
        });
      } catch ( e ) {
        console.warn(e);
      }
    } else {
      document.body.style.backgroundImage = back;
    }

    if ( settings.backgroundColor ) {
      document.body.style.backgroundColor = settings.backgroundColor;
    }

    if ( settings.fontFamily ) {
      document.body.style.fontFamily = settings.fontFamily;
    }

    if ( isFirefox ) {
      document.body.style.backgroundAttachment = 'fixed';
    } else {
      document.body.style.backgroundAttachment = 'scroll';
    }

    document.body.setAttribute('data-background-style', className);
  }

  /**
   * Set theme
   * @param {Object} settings Settings
   */
  setTheme(settings) {
    this.themeAction('destroy');

    this.setThemeScript(Assets.getThemeResource('theme.js'));

    if ( this.$animationLink ) {
      if ( settings.animations ) {
        const src = Assets.getPackageResource('CoreWM', 'animations.css');
        this.setAnimationLink(src);
      } else {
        this.setAnimationLink(Assets.getThemeCSS(null));
      }
    }

    document.body.setAttribute('data-style-theme', settings.styleTheme);
    document.body.setAttribute('data-icon-theme', settings.iconTheme);
    document.body.setAttribute('data-sound-theme', settings.soundTheme);

    this._setBackground(settings);

    this.settings.set(null, settings);
  }

  /**
   * Set animation stylesheet
   * @param {String} src Source file
   */
  setAnimationLink(src) {
    if ( this.$animationLink ) {
      this.$animationLink = DOM.$remove(this.$animationLink);
    }
    this.$animationLink = DOM.$createCSS(src);
  }

  /**
   * Set theme script
   * @param {String} src Source file
   */
  setThemeScript(src) {
    if ( this.$themeScript ) {
      this.$themeScript = DOM.$remove(this.$themeScript);
    }

    if ( src ) {
      this.$themeScript = DOM.$createJS(src, null, () => {
        this.themeAction('init');
      });
    }
  }

  /**
   * Gets current Style theme
   *
   * @param   {Boolean}    returnMetadata      Return theme metadata instead of name
   * @param   {Boolean}    [convert=false]     Converts the measures into px
   *
   * @return  {String}                      Or JSON
   */
  getStyleTheme(returnMetadata, convert) {
    const name = this.settings.get('styleTheme') || null;
    if ( returnMetadata ) {
      let found = null;
      if ( name ) {
        this.getStyleThemes().forEach(function(t) {
          if ( t && t.name === name ) {
            found = t;
          }
        });
      }

      // FIXME: Optimize
      if ( found && convert === true ) {
        const tmpEl = document.createElement('div');
        tmpEl.style.visibility = 'hidden';
        tmpEl.style.position = 'fixed';
        tmpEl.style.top = '-10000px';
        tmpEl.style.left = '-10000px';
        tmpEl.style.width = '1em';
        tmpEl.style.height = '1em';

        document.body.appendChild(tmpEl);
        const wd = tmpEl.offsetWidth;
        tmpEl.parentNode.removeChild(tmpEl);

        if ( typeof found.style.window.margin === 'string' && found.style.window.margin.match(/em$/) ) {
          const marginf = parseFloat(found.style.window.margin);
          found.style.window.margin = marginf * wd;
        }

        if ( typeof found.style.window.border === 'string' && found.style.window.border.match(/em$/) ) {
          const borderf = parseFloat(found.style.window.border);
          found.style.window.border = borderf * wd;
        }
      }

      return found;
    }

    return name;
  }

  /**
   * Gets current sound theme
   * @return {String}
   */
  getSoundTheme() {
    return this.settings.get('soundTheme', 'default');
  }

  /**
   * Gets current icon theme
   * @return {String}
   */
  getIconTheme() {
    return this.settings.get('iconTheme', 'default');
  }

  /**
   * Gets current sound theme
   * @return {String}
   */
  getSoundTheme() {
    return this.settings.get('soundTheme', 'default');
  }

  /**
   * Gets sound filename from key
   *
   * @param  {String}     k       Sound name key
   *
   * @return  {String}
   */
  getSoundFilename(k) {
    const compability = Compability.getCompability();
    if ( !compability.audio || !this.settings.get('enableSounds') || !k ) {
      return false;
    }

    const sounds = this.settings.get('sounds', {});
    return sounds[k] || null;
  }

  /**
   * Gets a list of Style themes
   *
   * @return  {String[]}   The list of themes
   */
  getStyleThemes() {
    return getConfig('Styles', []);
  }

  /**
   * Gets a list of Sound themes
   *
   * @return  {String[]}   The list of themes
   */
  getSoundThemes() {
    return getConfig('Sounds', []);
  }

  /**
   * Gets a list of Icon themes
   *
   * @return  {String[]}   The list of themes
   */
  getIconThemes() {
    return getConfig('Icons', []);
  }

}

export default (new Theme());
