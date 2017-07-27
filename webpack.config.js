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

const HtmlWebpackPlugin = require('html-webpack-plugin');
const FaviconsWebpackPlugin = require('favicons-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const fs = require('fs-extra');
const path = require('path');
const osjs = require('osjs-build');

///////////////////////////////////////////////////////////////////////////////
// GLOBALS
///////////////////////////////////////////////////////////////////////////////

const debug = process.env.OSJS_DEBUG ===  'true';
const standalone = process.env.OSJS_STANDALONE === 'true';

///////////////////////////////////////////////////////////////////////////////
// HELPERS
///////////////////////////////////////////////////////////////////////////////

function getFiltered(i) {
  if ( i.match(/^dev:/) && !debug ) {
    return false;
  }
  if ( i.match(/^prod:/) && debug ) {
    return false;
  }
  if ( i.match(/^standalone:/) && !standalone ) {
    return false;
  }
  return true;
}

const fixPath = (iter) => iter.replace(/^(dev|prod|standalone):/, '');
const getAbsolute = (filename) => path.resolve(__dirname, filename);

const findFile = (cfg, filename) => {
  const overlays = cfg.overlays || [];
  const tries = ([
    path.join(__dirname, 'src', filename)
  ]).concat(overlays.map((o) => {
    return path.resolve(__dirname, o, filename);
  }));

  return tries.find((iter) => {
    return fs.existsSync(iter);
  });
};

const getTemplateFile = (cfg, tpl, filename) => {
  return findFile(cfg, path.join('templates/dist', tpl, filename));
};

const findThemeFolders = (cfg, base) => {
  const overlays = cfg.overlays || [];
  return ([
    path.join(__dirname, 'src', base)
  ]).concat(overlays.map((o) => {
    return path.resolve(__dirname, o, base);
  })).filter((iter) => fs.existsSync(iter));
};

const findThemeFile = (cfg, base, name, filename) => {
  return findFile(cfg, path.join(base, name, filename));
};

const getStyleFile = (cfg, style) => {
  return findThemeFile(cfg, 'client/themes/styles', style, 'style.less');
};

const getFontFile = (cfg, font) => {
  return findThemeFile(cfg, 'client/themes/fonts', font, 'style.css');
};

const getIndexIncludes = (cfg) => {
  const result = {
    scripts: cfg.build.includes.scripts,
    styles: cfg.build.includes.styles
  };

  const overlays = cfg.build.overlays || {};
  Object.keys(overlays).forEach((n) => {
    const ol = overlays[n];
    if ( ol.includes ) {
      Object.keys(ol.includes).forEach((k) => {
        result[k] = result[k].concat(ol.includes[k]);
      });
    }
  });

  return {
    scripts: result.scripts.filter(getFiltered).map(fixPath),
    styles: result.styles.filter(getFiltered).map(fixPath)
  };
};

const getThemeFiles = (cfg) => {
  let files = [];
  files = files.concat(cfg.themes.fonts.map((f) => getFontFile(cfg, f)));
  files = files.concat(cfg.themes.styles.map((f) => getStyleFile(cfg, f)));

  return files.filter((f) => !!f);
};

const getStaticFiles = (cfg) => {
  let files = findThemeFolders(cfg, 'client/themes/wallpapers').map((f) => {
    return {
      context: getAbsolute(f),
      from: '*',
      to: 'themes/wallpapers'
    };
  });

  const mapAbsolute = (i) => {
    return {
      from: getAbsolute(fixPath(i))
    };
  };

  files = files.concat(cfg.build.static.filter(getFiltered).map(mapAbsolute));
  Object.keys(cfg.build.overlays).forEach((name) => {
    const ol = cfg.build.overlays[name];
    files = files.concat(ol.static.filter(getFiltered).map(mapAbsolute));
  });

  files = files.concat(cfg.themes.styles.map((i) => {
    return {
      from: findThemeFile(cfg, 'client/themes/styles', i, 'theme.js'),
      to: 'themes/styles/' + i
    };
  }));

  files = files.concat(cfg.themes.icons.map((i) => {
    return {
      from: findThemeFile(cfg, 'client/themes/icons', i, ''),
      to: 'themes/icons/' + i
    };
  }));

  files = files.concat(cfg.themes.sounds.map((i) => {
    return {
      from: findThemeFile(cfg, 'client/themes/sounds', i, ''),
      to: 'themes/sounds/' + i
    };
  }));

  return files;
};

///////////////////////////////////////////////////////////////////////////////
// EXPORTS
///////////////////////////////////////////////////////////////////////////////

module.exports = new Promise((resolve, reject) => {
  osjs.webpack.createConfiguration({
    exclude: /node_modules\/(?![axios|bluebird])/
  }).then((result) => {
    let {cfg, webpack, options} = result;

    if ( options.verbose ) {
      console.log('Build options', JSON.stringify(options));
    }

    if ( options.assets !== false ) {
      webpack.plugins = webpack.plugins.concat([
        new HtmlWebpackPlugin({
          template: getTemplateFile(cfg, cfg.build.template, 'index.ejs'),
          osjs: getIndexIncludes(cfg)
        }),

        new FaviconsWebpackPlugin(getTemplateFile(cfg, cfg.build.template, 'favicon.png')),

        new CopyWebpackPlugin(getStaticFiles(cfg), {
          ignore: [
            '*.less'
          ]
        })
      ]);
    }

    webpack.module.loaders.push({
      test: /((\w+)\.(eot|svg|ttf|woff|woff2))$/,
      loader: 'file-loader?name=themes/fonts/[name].[ext]'
    });

    const webpackConfig = Object.assign({}, cfg.build.webpack);
    webpackConfig.entry.themes = getThemeFiles(cfg);

    if ( options.debug ) {
      webpackConfig.entry.test = [
        getAbsolute('node_modules/mocha/mocha.js'),
        getAbsolute('node_modules/mocha/mocha.css'),
        getAbsolute('src/client/test/test.js')
      ];
    }

    Object.keys(webpackConfig.entry).forEach((k) => {
      webpackConfig.entry[k] = webpackConfig.entry[k]
        .filter(getFiltered)
        .map(fixPath)
        .map(getAbsolute)
        .map(osjs.utils.fixWinPath);
    });

    // Overlays
    Object.keys(cfg.build.overlays).forEach((name) => {
      const ol = cfg.build.overlays[name];
      const wp = ol.webpack;
      if ( wp ) {
        if ( wp.resolve && wp.resolve.modules ) {
          webpackConfig.resolve.modules = webpackConfig.resolve.modules.concat(wp.resolve.modules);
        }
        if ( wp.entry ) {
          Object.keys(wp.entry).forEach((en) => {
            if ( webpackConfig.entry[en] ) {
              webpackConfig.entry[en] = webpackConfig.entry[en].concat(wp.entry[en]);
            } else {
              webpackConfig.entry[en] = wp.entry(en);
            }

          });
        }
      }
    });

    const finalConfig = osjs.utils.mergeObject(webpack, webpackConfig);
    // Fixes "not an absolute path" problem in Webpack
    finalConfig.output.path = path.resolve(finalConfig.output.path);
    finalConfig.resolve.modules = finalConfig.resolve.modules.map(osjs.utils.fixWinPath);

    resolve(finalConfig);
  }).catch(reject);
});
