/* eslint new-cap:"off" */

//
// This is the backward compability layer for OS.js v2.0.x
//
module.exports = function() {
  window.OSjs = window.OSjs || {};

  // Make sure these namespaces exist
  (['Utils', 'API', 'GUI', 'Core', 'Dialogs', 'Helpers', 'Applications', 'Locales', 'VFS', 'Extensions', 'Auth', 'Storage', 'Connections', 'Broadway']).forEach(function(ns) {
    OSjs[ns] = OSjs[ns] || {};
  });

  (['Helpers']).forEach(function(ns) {
    OSjs.GUI[ns] = OSjs.GUI[ns] || {};
  });

  (['Helpers', 'Transports']).forEach(function(ns) {
    OSjs.VFS[ns] = OSjs.VFS[ns] || {};
  });

  const Process = require('core/process.js');
  const WindowManager = require('core/windowmanager.js');
  const SettingsManager = require('core/settings-manager.js');
  const SearchEngine = require('core/search-engine.js');
  const PackageManager = require('core/package-manager.js');
  const MountManager = require('core/mount-manager.js');
  const Authenticator = require('core/authenticator.js');
  const Connection = require('core/connection.js');
  const Storage = require('core/storage.js');
  const Assets = require('core/assets.js');

  const ExtendedDate = require('helpers/date.js');
  const DefaultApplicationWindow = require('helpers/default-application-window.js');
  const DefaultApplication = require('helpers/default-application.js');
  const EventHandler = require('helpers/event-handler.js');
  const IFrameApplication = require('helpers/iframe-application.js');
  const IFrameApplicationWindow = require('helpers/iframe-application-window.js');
  const GoogleAPI = require('helpers/google-api.js');
  const WindowsLiveAPI = require('helpers/windows-live-api.js');
  const SettingsFragment = require('helpers/settings-fragment.js');
  const ZipArchiver = require('helpers/zip-archiver.js');
  const ServiceNotificationIcon = require('helpers/service-notification-icon.js');

  const VFS = require('vfs/fs.js');
  const VFSFile = require('vfs/file.js');
  const VFSFileData = require('vfs/filedataurl.js');

  const FS = require('utils/fs.js');
  const DOM = require('utils/dom.js');
  const Preloader = require('utils/preloader.js');
  const Utils = require('utils/misc.js');
  const Events = require('utils/events.js');
  const Compability = require('utils/compability.js');
  const Locales = require('core/locales.js');
  const Config = require('core/config.js');
  const Dialog = require('core/dialog.js');
  const Main = require('core/main.js');
  const Clipboard = require('utils/clipboard.js');
  const Keycodes = require('utils/keycodes.js');

  const Init = require('core/init.js');

  const UIElement = require('gui/element.js');
  const UIDataView = require('gui/dataview.js');
  const UIScheme = require('gui/scheme.js');
  const GUIHelpers = require('utils/gui.js');
  const Hooks = require('helpers/hooks.js');
  const Menu = require('gui/menu.js');

  const assignInto = (lib, ns) => {
    return Object.keys(lib).forEach((k) => {
      ns[k] = lib[k];
    });
  };

  OSjs.Core.DialogWindow = Dialog.default;
  OSjs.Core.Window = Object.seal(require('core/window.js').default);
  OSjs.Core.WindowManager = Object.seal(WindowManager.default);
  OSjs.Core.Service = Object.seal(require('core/service.js').default);
  OSjs.Core.Process = Object.seal(Process.default);
  OSjs.Core.Application = Object.seal(require('core/application.js').default);

  OSjs.GUI.Element = Object.seal(UIElement.default);
  OSjs.GUI.DataView = Object.seal(UIDataView.default);
  OSjs.GUI.Scheme = Object.seal(UIScheme.default);
  OSjs.GUI.Helpers = Object.seal(GUIHelpers);

  assignInto(Hooks, OSjs.API);
  OSjs.VFS.FileDataURL = VFSFileData.default;
  OSjs.VFS.File = VFSFile.default;
  assignInto(FS, OSjs.VFS.Helpers);

  assignInto(FS, OSjs.Utils);
  assignInto(DOM, OSjs.Utils);
  assignInto(Utils, OSjs.Utils);
  assignInto(Events, OSjs.Utils);
  assignInto(Compability, OSjs.Utils);

  OSjs.Utils.Keys = Keycodes.default;
  OSjs.Utils.preload = function() {
    console.error('THIS FUNCTION WAS REMOVED');
  };
  OSjs.Utils.preloader = Preloader.default.preload;

  OSjs.Helpers.Date = ExtendedDate.default;
  OSjs.Helpers.DefaultApplicationWindow = DefaultApplicationWindow.default;
  OSjs.Helpers.DefaultApplication = DefaultApplication.default;
  OSjs.Helpers.EventHandler = EventHandler.default;
  OSjs.Helpers.IFrameApplication = IFrameApplication.default;
  OSjs.Helpers.IFrameApplicationWindow = IFrameApplicationWindow.default;
  OSjs.Helpers.SettingsFragment = SettingsFragment.default;
  OSjs.Helpers.GoogleAPI = OSjs.Helpers.GoogleAPI || {};
  OSjs.Helpers.WindowsLiveAPI = OSjs.Helpers.WindowsLiveAPI || {};
  OSjs.Helpers.ZipArchiver = OSjs.Helpers.ZipArchiver || {};

  OSjs.API.killAll = Process.default.killAll;
  OSjs.API.kill = Process.default.kill;
  OSjs.API.message = Process.default.message;
  OSjs.API.getProcess = Process.default.getProcess;
  OSjs.API.getProcesses = Process.default.getProcesses;
  OSjs.API._ = Locales._;
  OSjs.API.__ = Locales.__;
  OSjs.API.setLocale = Locales.setLocale;
  OSjs.API.getLocale = Locales.getLocale;
  OSjs.API.getConfig = Config.getConfig;
  OSjs.API.getDefaultPath = Config.getDefaultPath;
  OSjs.API.isStandalone = Config.isStandalone;
  OSjs.API.getBrowserPath = Config.getBrowserPath;
  OSjs.API.createDialog = Dialog.default.create;
  OSjs.API.createMenu = Menu.create;
  OSjs.API.blurMenu = Menu.blur;
  OSjs.API.signOut = Init.logout;
  OSjs.API.createNotification = (opts) => WindowManager.default.instance.notification(opts);
  assignInto(Assets, OSjs.API);
  assignInto(Main, OSjs.API);
  assignInto(Clipboard, OSjs.API);

  OSjs.VFS.find = function(item, args, callback, options) {
    VFS.find(item, args, options).then((res) => callback(false, res)).catch(callback);
  };
  OSjs.VFS.scandir =  function(item, callback, options) {
    VFS.scandir(item, options).then((res) => callback(false, res)).catch(callback);
  };
  OSjs.VFS.write = function(item, data, callback, options, appRef) {
    VFS.write(item, data, options, appRef).then((res) => callback(false, res)).catch(callback);
  };
  OSjs.VFS.read = function(item, callback, options) {
    VFS.read(item, options).then((res) => callback(false, res)).catch(callback);
  };
  OSjs.VFS.copy = function(src, dest, callback, options, appRef) {
    VFS.copy(src, dest, options, appRef).then((res) => callback(false, res)).catch(callback);
  };
  OSjs.VFS.move = function(src, dest, callback, options, appRef) {
    VFS.move(src, dest, options, appRef).then((res) => callback(false, res)).catch(callback);
  };
  OSjs.VFS.rename = OSjs.VFS.move;

  OSjs.VFS.unlink = function(item, callback, options, appRef) {
    VFS.unlink(item, options, appRef).then((res) => callback(false, res)).catch(callback);
  };

  OSjs.VFS.mkdir = function(item, callback, options, appRef) {
    VFS.mkdir(item, options, appRef).then((res) => callback(false, res)).catch(callback);
  };

  OSjs.VFS.exists = function(item, callback) {
    VFS.exists(item).then((res) => callback(false, res)).catch(callback);
  };
  OSjs.VFS.fileinfo = function(item, callback) {
    VFS.fileinfo(item).then((res) => callback(false, res)).catch(callback);
  };

  OSjs.VFS.url = function(item, callback, options) {
    VFS.url(item, options).then((res) => callback(false, res)).catch(callback);
  };

  OSjs.VFS.upload = function(args, callback, options, appRef) {

  };

  OSjs.VFS.download = function(item, callback) {
    VFS.download(item).then((res) => callback(false, res)).catch(callback);
  };

  OSjs.VFS.transh = function(item, callback) {
    VFS.trash(item).then((res) => callback(false, res)).catch(callback);
  };

  OSjs.VFS.untransh = function(item, callback) {
    VFS.untrash(item).then((res) => callback(false, res)).catch(callback);
  };

  OSjs.VFS.emptyTrash = function(callback) {
    VFS.emptyTrash().then((res) => callback(false, res)).catch(callback);
  };

  OSjs.VFS.freeSpace = function(item, callback) {
    VFS.freeSpace(item).then((res) => callback(false, res)).catch(callback);
  };

  OSjs.VFS.watch = function(item, cb) {
    VFS.watch(item, cb);
  };

  OSjs.VFS.unwatch = VFS.unwatch;

  OSjs.VFS.triggerWatch = VFS.triggerWatch;

  OSjs.VFS['delete'] = OSjs.VFS.unlink;

  module.exports.getServiceNotificationIcon = function() {
    return ServiceNotificationIcon;
  };

  OSjs.API.launch = function(name, args, ondone, onerror, onconstruct) {
    ondone = ondone || function() {};
    onerror = onerror || function() {};

    Main.launch(name, args, onconstruct)
      .then(ondone)
      .catch(onerror);
  };

  OSjs.API.launchList = function(list, onSuccess, onError, onFinished) {
    list        = list        || []; /* idx => {name: 'string', args: 'object', data: 'mixed, optional'} */
    onSuccess   = onSuccess   || function() {};
    onError     = onError     || function() {};
    onFinished  = onFinished  || function() {};

    Main.launchList(list, onSuccess).then(onFinished).catch(onError);
  };

  OSjs.API.open = function(file, launchArgs) {
    return Main.openFile(file, launchArgs);
  };

  OSjs.API.relaunch = function(n) {
    function relaunch(p) {
      let data = null;
      let args = {};
      if ( p instanceof Process ) {
        data = p._getSessionData();
      }

      try {
        n = p.__pname;
        p.destroy(); // kill
      } catch ( e ) {
        console.warn('OSjs.module.exports.relaunch()', e.stack, e);
      }

      if ( data !== null ) {
        args = data.args;
        args.__resume__ = true;
        args.__windows__ = data.windows || [];
      }

      args.__preload__ = {force: true};

      //setTimeout with 500 ms is used to allow applications that might need
      //  some time to destroy resources before it can be relaunched.
      setTimeout(() => {
        module.exports.launch(n, args);
      }, 500);
    }

    let res = Process.getProcess(n);
    if ( !(res instanceof Array) ) {
      res = [res];
    }
    res.forEach(relaunch);
  };

  OSjs.API.call = function(m, a, cb, options) {
    Connection.request(m, a, options).then((res) => {
      cb(false, res);
    }).catch(cb);
  };

  OSjs.API.getApplicationResource = function(app, name, vfspath) {
    return Assets.getPackageResource(app, name, vfspath);
  };

  OSjs.API.curl = function(args, callback) {
    args = args || {};
    callback = callback || {};

    let opts = args.body;
    if ( typeof opts === 'object' ) {
      console.warn('DEPRECATION WARNING', 'The \'body\' wrapper is no longer needed');
    } else {
      opts = args;
    }

    return OSjs.API.call('curl', opts, callback, args.options);
  };

  module.exports.checkPermission = function(group) {
    return Authenticator.default.instance().checkPermission(group);
  };

  OSjs.Core.getSettingsManager = function Core_getSettingsManager() {
    return SettingsManager.default;
  };

  OSjs.Core.getSearchEngine = function Core_getSearchEngine() {
    return SearchEngine.default;
  };

  OSjs.Core.getPackageManager = function Core_getPackageManager() {
    return PackageManager.default;
  };

  OSjs.Core.getMountManager = function Core_getMountManager() {
    return MountManager.default;
  };

  OSjs.Core.getHandler = function() {
    console.warn('HANDLER IS DEPRECATED. YOU SHOULD UPDATE YOUR CODE!');
    return (function() {
      var auth = OSjs.Core.getAuthenticator();
      var conn = OSjs.Core.getConnection();
      var stor = OSjs.Core.getStorage();

      return {
        loggedIn: auth.isLoggedIn(),
        offline: conn.isOffline(),
        userData: auth.getUser(),
        callAPI: conn.request,
        saveSettings: stor.saveSettings
      };
    })();
  };

  OSjs.Core.getConfig = OSjs.Core.getConfig || function() {
    return OSjs.getConfig ? OSjs.getConfig() : {};
  };

  OSjs.Core.getMetadata = OSjs.Core.getMetadata || function() {
    return OSjs.getManifest ? OSjs.getManifest() : {};
  };

  OSjs.Core.getConnection = function Core_getConnection() {
    return Connection.default.instance;
  };

  OSjs.Core.getStorage = function Core_getStorage() {
    return Storage.default.instance;
  };

  OSjs.Core.getAuthenticator = function Core_getAuthenticator() {
    return Authenticator.default.instance;
  };

  OSjs.Core.getWindowManager  = function Core_getWindowManager() {
    return WindowManager.default.instance;
  };

  OSjs.GUI.createScheme = function(url) {
    console.error('FUNCTION REMOVED');
  };

  OSjs.Utils.getRect = function Utils_getRect() {
    const body = document.body || {};
    return {
      top: 0,
      left: 0,
      width: body.offsetWidth || 0,
      height: body.offsetHeight || 0
    };
  };

  OSjs.VFS.file = function createFileInstance(arg, mime) {
    return new VFSFile.default(arg, mime);
  };

  OSjs.Helpers.GoogleAPI.getInstance = function() {
    return GoogleAPI.instance();
  };

  OSjs.Helpers.GoogleAPI.createInstance = function(args, callback) {
    return GoogleAPI.craete(args, callback);
  };

  OSjs.Helpers.WindowsLiveAPI.getInstance = function() {
    return WindowsLiveAPI.instance();
  };

  OSjs.Helpers.WindowsLiveAPI.createInstance = function(args, callback) {
    return WindowsLiveAPI.create(args, callback);
  };

  OSjs.Helpers.ZipArchiver.getInstance = function() {
    return ZipArchiver.instance();
  };

  OSjs.Helpers.ZipArchiver.createInstance = function(args, callback) {
    ZipArchiver.create(args, callback);
  };

};
