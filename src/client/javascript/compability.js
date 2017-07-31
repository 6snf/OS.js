/* eslint new-cap:"off" */
/* eslint dot-notation:"off" */
let layer;

//
// This is the backward compability layer for OS.js v2.0.x
//
module.exports = function() {
  if ( layer ) {
    return layer;
  }

  layer = Object.assign({}, window.OSjs || {});

  // Make sure these namespaces exist
  (['Utils', 'API', 'GUI', 'Core', 'Dialogs', 'Helpers', 'Applications', 'Locales', 'VFS', 'Extensions', 'Auth', 'Storage', 'Connections', 'Broadway']).forEach(function(ns) {
    layer[ns] = layer[ns] || {};
  });

  (['Helpers']).forEach(function(ns) {
    layer.GUI[ns] = layer.GUI[ns] || {};
  });

  (['Helpers', 'Transports']).forEach(function(ns) {
    layer.VFS[ns] = layer.VFS[ns] || {};
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

  layer.Core.DialogWindow = Dialog.default;
  layer.Core.Window = Object.seal(require('core/window.js').default);
  layer.Core.WindowManager = Object.seal(WindowManager.default);
  layer.Core.Service = Object.seal(require('core/service.js').default);
  layer.Core.Process = Object.seal(Process.default);
  layer.Core.Application = Object.seal(require('core/application.js').default);

  layer.GUI.Element = Object.seal(UIElement.default);
  layer.GUI.DataView = Object.seal(UIDataView.default);
  layer.GUI.Scheme = Object.seal(UIScheme.default);
  layer.GUI.Helpers = Object.seal(GUIHelpers);

  assignInto(Hooks, layer.API);
  layer.VFS.FileDataURL = VFSFileData.default;
  layer.VFS.File = VFSFile.default;
  assignInto(FS, layer.VFS.Helpers);

  assignInto(FS, layer.Utils);
  assignInto(DOM, layer.Utils);
  assignInto(Utils, layer.Utils);
  assignInto(Events, layer.Utils);
  assignInto(Compability, layer.Utils);

  layer.Utils.Keys = Keycodes.default;
  layer.Utils.preload = function() {
    console.error('THIS FUNCTION WAS REMOVED');
  };
  layer.Utils.preloader = Preloader.default.preload;

  layer.Helpers.Date = ExtendedDate.default;
  layer.Helpers.DefaultApplicationWindow = DefaultApplicationWindow.default;
  layer.Helpers.DefaultApplication = DefaultApplication.default;
  layer.Helpers.EventHandler = EventHandler.default;
  layer.Helpers.IFrameApplication = IFrameApplication.default;
  layer.Helpers.IFrameApplicationWindow = IFrameApplicationWindow.default;
  layer.Helpers.SettingsFragment = SettingsFragment.default;
  layer.Helpers.GoogleAPI = layer.Helpers.GoogleAPI || {};
  layer.Helpers.WindowsLiveAPI = layer.Helpers.WindowsLiveAPI || {};
  layer.Helpers.ZipArchiver = layer.Helpers.ZipArchiver || {};

  layer.API.killAll = Process.default.killAll;
  layer.API.kill = Process.default.kill;
  layer.API.message = Process.default.message;
  layer.API.getProcess = Process.default.getProcess;
  layer.API.getProcesses = Process.default.getProcesses;
  layer.API._ = Locales._;
  layer.API.__ = Locales.__;
  layer.API.setLocale = Locales.setLocale;
  layer.API.getLocale = Locales.getLocale;
  layer.API.getConfig = Config.getConfig;
  layer.API.getDefaultPath = Config.getDefaultPath;
  layer.API.isStandalone = Config.isStandalone;
  layer.API.getBrowserPath = Config.getBrowserPath;
  layer.API.createDialog = Dialog.default.create;
  layer.API.createMenu = Menu.create;
  layer.API.blurMenu = Menu.blur;
  layer.API.signOut = Init.logout;
  layer.API.createNotification = (opts) => WindowManager.default.instance.notification(opts);
  assignInto(Assets, layer.API);
  assignInto(Clipboard, layer.API);

  layer.VFS.find = function(item, args, callback, options) {
    VFS.find(item, args, options).then((res) => callback(false, res)).catch(callback);
  };
  layer.VFS.scandir =  function(item, callback, options) {
    VFS.scandir(item, options).then((res) => callback(false, res)).catch(callback);
  };
  layer.VFS.write = function(item, data, callback, options, appRef) {
    VFS.write(item, data, options, appRef).then((res) => callback(false, res)).catch(callback);
  };
  layer.VFS.read = function(item, callback, options) {
    VFS.read(item, options).then((res) => callback(false, res)).catch(callback);
  };
  layer.VFS.copy = function(src, dest, callback, options, appRef) {
    VFS.copy(src, dest, options, appRef).then((res) => callback(false, res)).catch(callback);
  };
  layer.VFS.move = function(src, dest, callback, options, appRef) {
    VFS.move(src, dest, options, appRef).then((res) => callback(false, res)).catch(callback);
  };
  layer.VFS.rename = layer.VFS.move;

  layer.VFS.unlink = function(item, callback, options, appRef) {
    VFS.unlink(item, options, appRef).then((res) => callback(false, res)).catch(callback);
  };

  layer.VFS.mkdir = function(item, callback, options, appRef) {
    VFS.mkdir(item, options, appRef).then((res) => callback(false, res)).catch(callback);
  };

  layer.VFS.exists = function(item, callback) {
    VFS.exists(item).then((res) => callback(false, res)).catch(callback);
  };
  layer.VFS.fileinfo = function(item, callback) {
    VFS.fileinfo(item).then((res) => callback(false, res)).catch(callback);
  };

  layer.VFS.url = function(item, callback, options) {
    VFS.url(item, options).then((res) => callback(false, res)).catch(callback);
  };

  layer.VFS.upload = function(args, callback, options, appRef) {

  };

  layer.VFS.download = function(item, callback) {
    VFS.download(item).then((res) => callback(false, res)).catch(callback);
  };

  layer.VFS.transh = function(item, callback) {
    VFS.trash(item).then((res) => callback(false, res)).catch(callback);
  };

  layer.VFS.untransh = function(item, callback) {
    VFS.untrash(item).then((res) => callback(false, res)).catch(callback);
  };

  layer.VFS.emptyTrash = function(callback) {
    VFS.emptyTrash().then((res) => callback(false, res)).catch(callback);
  };

  layer.VFS.freeSpace = function(item, callback) {
    VFS.freeSpace(item).then((res) => callback(false, res)).catch(callback);
  };

  layer.VFS.watch = function(item, cb) {
    VFS.watch(item, cb);
  };

  layer.VFS.unwatch = VFS.unwatch;

  layer.VFS.triggerWatch = VFS.triggerWatch;

  layer.VFS['delete'] = layer.VFS.unlink;

  module.exports.getServiceNotificationIcon = function() {
    return ServiceNotificationIcon;
  };

  layer.API.launch = function(name, args, ondone, onerror, onconstruct) {
    ondone = ondone || function() {};
    onerror = onerror || function() {};

    Process.create(name, args, onconstruct)
      .then(ondone)
      .catch(onerror);
  };

  layer.API.launchList = function(list, onSuccess, onError, onFinished) {
    list        = list        || []; /* idx => {name: 'string', args: 'object', data: 'mixed, optional'} */
    onSuccess   = onSuccess   || function() {};
    onError     = onError     || function() {};
    onFinished  = onFinished  || function() {};

    Process.createFromArray(list, onSuccess).then(onFinished).catch(onError);
  };

  layer.API.open = function(file, launchArgs) {
    return Process.createFromFile(file, launchArgs);
  };

  layer.API.relaunch = function(n) {
    return Process.reload(n);
  };

  layer.API.call = function(m, a, cb, options) {
    Connection.request(m, a, options).then((res) => {
      cb(false, res);
    }).catch(cb);
  };

  layer.API.getApplicationResource = function(app, name, vfspath) {
    return Assets.getPackageResource(app, name, vfspath);
  };

  layer.API.curl = function(args, callback) {
    args = args || {};
    callback = callback || {};

    let opts = args.body;
    if ( typeof opts === 'object' ) {
      console.warn('DEPRECATION WARNING', 'The \'body\' wrapper is no longer needed');
    } else {
      opts = args;
    }

    return layer.API.call('curl', opts, callback, args.options);
  };

  module.exports.checkPermission = function(group) {
    return Authenticator.default.instance().checkPermission(group);
  };

  layer.Core.getSettingsManager = function Core_getSettingsManager() {
    return SettingsManager.default;
  };

  layer.Core.getSearchEngine = function Core_getSearchEngine() {
    return SearchEngine.default;
  };

  layer.Core.getPackageManager = function Core_getPackageManager() {
    return PackageManager.default;
  };

  layer.Core.getMountManager = function Core_getMountManager() {
    return MountManager.default;
  };

  layer.Core.getHandler = function() {
    console.warn('HANDLER IS DEPRECATED. YOU SHOULD UPDATE YOUR CODE!');
    return (function() {
      var auth = layer.Core.getAuthenticator();
      var conn = layer.Core.getConnection();
      var stor = layer.Core.getStorage();

      return {
        loggedIn: auth.isLoggedIn(),
        offline: conn.isOffline(),
        userData: auth.getUser(),
        callAPI: conn.request,
        saveSettings: stor.saveSettings
      };
    })();
  };

  layer.Core.getConfig = layer.Core.getConfig || function() {
    return layer.getConfig ? layer.getConfig() : {};
  };

  layer.Core.getMetadata = layer.Core.getMetadata || function() {
    return layer.getManifest ? layer.getManifest() : {};
  };

  layer.Core.getConnection = function Core_getConnection() {
    return Connection.default.instance;
  };

  layer.Core.getStorage = function Core_getStorage() {
    return Storage.default.instance;
  };

  layer.Core.getAuthenticator = function Core_getAuthenticator() {
    return Authenticator.default.instance;
  };

  layer.Core.getWindowManager  = function Core_getWindowManager() {
    return WindowManager.default.instance;
  };

  layer.GUI.createScheme = function(url) {
    console.error('FUNCTION REMOVED');
  };

  layer.Utils.getRect = function Utils_getRect() {
    const body = document.body || {};
    return {
      top: 0,
      left: 0,
      width: body.offsetWidth || 0,
      height: body.offsetHeight || 0
    };
  };

  layer.VFS.file = function createFileInstance(arg, mime) {
    return new VFSFile.default(arg, mime);
  };

  layer.Helpers.GoogleAPI.getInstance = function() {
    return GoogleAPI.instance();
  };

  layer.Helpers.GoogleAPI.createInstance = function(args, callback) {
    return GoogleAPI.craete(args, callback);
  };

  layer.Helpers.WindowsLiveAPI.getInstance = function() {
    return WindowsLiveAPI.instance();
  };

  layer.Helpers.WindowsLiveAPI.createInstance = function(args, callback) {
    return WindowsLiveAPI.create(args, callback);
  };

  layer.Helpers.ZipArchiver.getInstance = function() {
    return ZipArchiver.instance();
  };

  layer.Helpers.ZipArchiver.createInstance = function(args, callback) {
    ZipArchiver.create(args, callback);
  };

  return layer;
};
