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
require('app-module-path/register');

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs-extra');
const compression = require('compression');
const minimist = require('minimist');
const formidable = require('formidable');
const ws = require('ws');
const cookie = require('cookie');
const parser = require('cookie-parser');
const morgan = require('morgan');
const colors = require('colors');

const modules = require('./modules.js');
const settings = require('./settings.js');

///////////////////////////////////////////////////////////////////////////////
// GLOBALS
///////////////////////////////////////////////////////////////////////////////

const app = express();
const tmpdir = (() => {
  try {
    return require('os').tmpdir();
  } catch ( e ) {
    return '/tmp';
  }
})();

let sidMap = {};
let websocketMap = {};
let appServer, appProxy, appWebsocket, appSession;

///////////////////////////////////////////////////////////////////////////////
// HELPERS
///////////////////////////////////////////////////////////////////////////////

/*
 * Crate session wrapper
 */
const createSessionWrapper = (req) => {
  return {
    set: (k, v) => {
      req.session[k] = v;
    },
    get: (k) => {
      return req.session[k];
    }
  };
};

/*
 * Gets Session ID from request
 */
const getSessionId = (request) => {
  const header = request.headers.cookie;
  if ( !header ) {
    return null;
  }

  const cookies = cookie.parse(header);
  const secret = settings.get('http.session.secret');
  const key = settings.get('http.session.name') || 'connect.sid';
  return parser.signedCookie(cookies[key], secret);
};

/*
 * Parses a query
 */
const getParsedQuery = (query, regexp, route) => {
  if ( typeof route !== 'string' ) {
    route = '';
  }

  const values = query.split(regexp).filter((str) => !!str);
  const keys = (route.match(/\:([A-z0-9_]+)/g) || []).map((str) => {
    return str.substr(1);
  });

  if ( keys.length === values.length ) {
    const result = {};
    keys.forEach((k, i) => (result[k] = values[i]));
    return result;
  }

  return values;
};

/*
 * Create route request wrapper
 */
const createWrapper = () => {
  const methods = ['use', 'post', 'get', 'head', 'put', 'delete'];

  function getWebsocketFromUser(username) {
    let foundSid = null;

    Object.keys(sidMap).forEach((sid) => {
      if ( foundSid === null && sidMap[sid] === username ) {
        foundSid = sid;
      }
    });

    if ( websocketMap[foundSid] ) {
      console.warn('FOUND YOUR USER WEBSOCKET', foundSid);
      return websocketMap[foundSid];
    }

    return null;
  }

  function broadcastMessage(username, action, message) {
    const data = JSON.stringify({
      action: action,
      args: message
    });

    if ( username ) {
      const ws = getWebsocketFromUser(username);
      ws.send(data);
    } else {
      appWebsocket.clients.forEach((client) => client.send(data));
    }
  }

  const wrapperMethods = {
    broadcastMessage,
    isWebsocket: () => !!appWebsocket,
    getServer: () => appServer,
    getProxy: () => appProxy,
    getWebsocket: () => appWebsocket,
    getApp: () => app,
    setActiveUser: (req, add) => {
      const sid = getSessionId(req);
      const username = req.session.username;

      if ( add ) {
        sidMap[sid] = username;
      } else {
        if ( sidMap[sid] ) {
          delete sidMap[sid];
        }
      }
    }
  };

  const createHttpObject = (req, res, next, data) => {
    if ( typeof data === 'undefined' ) {
      data = req.method.toUpperCase() === 'POST' ? req.body : req.query;
    }

    return Object.assign({
      request: req,
      response: res,
      next: next,
      data: data,
      session: createSessionWrapper(req)
    }, wrapperMethods);
  };

  const result = Object.assign({
    upload: (q, cb) => {
      const form = new formidable.IncomingForm({
        uploadDir: tmpdir
      });

      app.post(q, (req, res, next) => {
        form.parse(req, (err, fields, files) => {
          cb(createHttpObject(req, res, next, {fields, files}));
        });
      });
    }
  }, wrapperMethods);

  methods.forEach((method) => {
    result[method] = (q, cb) => {
      return app[method](q, (req, res, next) => {
        return cb(createHttpObject(req, res, next));
      });
    };
  });

  return result;
};

/*
 * Handles a Websocket Message
 */
const handleWebsocketMessage = (ws, msg, req) => {
  const query = msg.path;
  const args = msg.args || {};
  const index = msg._index;

  const found = app._router.stack.filter((iter) => {
    return iter.name === 'bound dispatch' && iter.regexp !== /^\/?(?=\/|$)/i;
  }).find((iter) => {
    return iter.match(query);
  });

  const send = (newRequest, data) => {
    if ( typeof index !== 'undefined' ) {
      data._index = index;
    }

    if ( data.error instanceof Error ) {
      console.error(data.error);
      data.error = data.error.toString();
    }

    const module = modules.getSession() || {};
    const sid = getSessionId(newRequest);

    if ( module.touch ) {
      module.touch(sid, newRequest.session, (err, session) => {
        if ( session ) {
          newRequest.session = session;
        }
        if ( err ) {
          console.error(err);
        }

        ws.send(JSON.stringify(data));
      });
    } else {
      ws.send(JSON.stringify(data));
    }
  };

  const respond = (newRequest) => {
    if ( found ) {
      newRequest.params = getParsedQuery(query, found.regexp, found.route.path);

      const responder = {
        status: () => responder,
        send: (data) => send(newRequest, data),
        json: (data) => send(newRequest, data)
      };

      found.handle_request(newRequest, responder, () => {
        console.error('Not handled', query);
      });
    } else {
      console.error(404, query);
    }
  };

  appSession(req, {}, (err) => {
    respond(Object.assign(req, {
      method: 'POST',
      query: query,
      body: args
    }));
  });
};

///////////////////////////////////////////////////////////////////////////////
// Initializers
///////////////////////////////////////////////////////////////////////////////

/*
 * Initializes Settings
 */
const initSettings = (opts) => {
  settings.load(minimist(process.argv.slice(2)), {
    HOSTNAME: null,
    DEBUG: false,
    PORT: null,
    LOGLEVEL: 7,
    NODEDIR: path.resolve(__dirname + '/../'),
    ROOTDIR: path.resolve(__dirname + '/../../../'),
    SERVERDIR: path.resolve(__dirname + '/../'),
    MODULEDIR: [
      path.resolve(__dirname + '/modules')
    ]
  }, opts);
};

/*
 * Initializes Middleware
 */
const initMiddleware = () => {
  if ( settings.option('LOGLEVEL') ) {
    app.use(morgan(settings.get('logger.format')));
  }

  app.use(bodyParser.json());
  app.use(compression({
    level: settings.get('http.compression.level'),
    memLevel: settings.get('http.compression.memLevel')
  }));

  appSession = session({
    store: modules.loadSession(session),
    resave: false,
    saveUninitialized: true, // Important for WS
    name: settings.get('http.session.name') || 'connect.sid',
    secret: settings.get('http.session.secret'),
    cookie: settings.get('http.session.cookie')
  });
  app.use(appSession);

  createWrapper().get(/^\/?packages\/(.*\/.*)\/(.*)/, (http) => {
    const name = http.request.params[0];

    modules.getAuthenticator().checkPackagePermission(http, name).then(() => {
      http.next();
    }).catch((error) => {
      http.response.status(403).send(error);
    });
  });

  app.use(express.static('dist'));

  app.use((err, req, res, next) => {
    if ( err ) {
      console.error(err);
    }
  });
};

/*
 * Initializes Webserver
 */
const initWebserver = () => {
  const isHttp2 = settings.get('http.mode') === 'http2';
  const httpServer = require(isHttp2 ? 'spdy' : 'http');
  const httpPort = settings.option('PORT') || settings.get('http.port');
  const hostname = settings.option('HOSTNAME') || settings.get('http.hostname');

  console.log(colors.bold('Creating'),  colors.green(isHttp2 ? 'spdy' : 'http'), 'server on', hostname + '@' + httpPort, 'with');
  if ( isHttp2 ) {
    const rdir = settings.get('http.cert.path') || settings.option('SERVERDIR');
    const cname = settings.get('http.cert.name') || 'localhost';
    const copts = settings.get('http.cert.options') || {};
    copts.key = fs.readFileSync(path.join(rdir, cname + '.key'));
    copts.cert = fs.readFileSync(path.join(rdir, cname + '.crt'));

    appServer = httpServer.createServer(copts, app);
  } else {
    appServer = httpServer.createServer(app);
  }

  appServer.listen(httpPort, hostname, null, (err) => {
    if ( err ) {
      console.error(err);
    }
  });
};

/*
 * Initializes Websockets
 */
const initWebsockets = () => {
  const hostname = settings.option('HOSTNAME') || settings.get('http.hostname');
  const wsSettings = settings.get('http.ws');
  const wsOptions = {
    server: appServer,
    path: wsSettings.path
  };

  if ( wsSettings.port !== 'upgrade' ) {
    wsOptions.port = wsSettings.port;
  }

  console.log(colors.bold('Creating'), colors.green('websocket'), 'server on', hostname + '@' + wsSettings.port + wsSettings.path);

  appWebsocket = new ws.Server(wsOptions);
  appWebsocket.on('connection', (ws, upgradeReq) => {
    const sid = getSessionId(upgradeReq);

    ws.on('message', (msg) => {
      try {
        msg = JSON.parse(msg);
        handleWebsocketMessage(ws, msg, upgradeReq);
      } catch ( e ) {
        console.error(e);
      }
    });

    ws.on('close', () => {
      if ( typeof websocketMap[sid] !== 'undefined' ) {
        delete websocketMap[sid];
      }
      console.info('< Closed a Websocket connection...');
    });

    websocketMap[sid] = ws;

    console.info('> Created a Websocket connection...');
  });
};

///////////////////////////////////////////////////////////////////////////////
// EXPORTS
///////////////////////////////////////////////////////////////////////////////

module.exports.shutdown = () => {
  console.log('\n');

  if ( appWebsocket ) {
    appWebsocket = appWebsocket.close();
  }
  if ( appServer ) {
    appServer = appServer.close();
  }
  if ( appProxy ) {
    appProxy = appProxy.close();
  }

  sidMap = {};
  websocketMap = {};

  modules.destroy()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
};

module.exports.start = (opts) => {
  return new Promise((resolve, reject) => {

    try {
      initSettings(opts);

      const runningOptions = settings.option();
      if ( runningOptions.DEBUG ) {
        Object.keys(runningOptions).forEach((k) => {
          console.log('-', k, '=', runningOptions[k]);
        });
      }

      initMiddleware();
      initWebserver();

      if ( settings.get('http.mode') === 'ws' ) {
        initWebsockets();
      }
    } catch ( e ) {
      reject(e);
      return;
    }

    const wrapper = createWrapper();
    modules.load(app, wrapper).then(() => {
      console.info('Running...');

      return resolve(appServer);
    }).catch(reject);

  });
};
