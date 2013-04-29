var prettyjson = require('prettyjson');
var program = require('commander');
var request = require('request');
var fs = require('fs');
var path = require('path');

var API_ROOT = 'https://api.weixin.qq.com/cgi-bin/';

function cleanReturns(callback) {
  return function(err, res, body) {
    if (err) {
      console.error();
      console.trace(err);
      return process.exit();
    }

    console.log();
    console.log(res.req.method.cyan, res.request.path.cyan);

    if (err) {
      console.error('Request to wexin api failed: ');
      console.error(err);
      return process.exit();
    }

    var json;
    try {
      json = JSON.parse(body)
    } catch (e) {
      console.error(body);
      console.error('Parse weixin api returns failed.');
    }

    console.error();
    if (json.errcode) {
      console.error('[ERROR %s]'.red, json.errcode, json.errmsg);
    } else {
      console.log(prettyjson.render(json));
    }
    console.error();

    callback(json);
  }
}

function getToken(appid, secret, callback) {
  request(API_ROOT + 'token',
    {
      qs: {
        appid: appid,
        secret: secret,
        grant_type: 'client_credential',
      }
    },
    cleanReturns(function(ret) {
      if (ret.errcode) {
        console.log('');
        console.log('Get access_token failed.'.yellow);
        console.log('');
        process.exit();
      }
      callback(ret);
    })
  );
}

function sendRequest(api, token, body, callback) {
  var tmp = api.split(' ');
  var method;
  if (tmp.length > 1) {
    method = tmp[0].toUpperCase();
    api = tmp[1];
  }

  var url = API_ROOT + api; 

  request(url, {
    method: method || 'GET',
    qs: {
      access_token: token
    },
    body: body
  }, cleanReturns(callback));
}

var prepares = {};

/**
 * Get menu json from stdio.
 */
prepares['create'] = function(callback) {
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  var json = '';
  process.stdin.on('data', function(chunk) {
    json += chunk;
  });
  process.stdin.on('end', function() {
    callback(json);
  });
};

var actions = {
  create: 'POST menu/create',
  'delete': 'menu/delete',
  get: 'menu/get',
};

var aliases = {
  'remove': 'delete',
  'list': 'get'
};

function doAction(act, token) {
  if (act in prepares) {
    prepares[act](function(body) {
      sendRequest(actions[act], token, body, process.exit);
    });
    return;
  }
  sendRequest(actions[act], token, null, process.exit);
}

function go(options) {
  var action = options.action;

  if (!(action in actions)) {
    exports.helpInfo();
    return process.exit();
  }

  var token;

  if (isValidToken(options.token)) {
    return doAction(action, options.token.access_token);
  }

  getToken(options.appid, options.secret, function(token_info) {

    token_info.expire_date = new Date(+new Date() + parseInt(token_info.expires_in, 10) * 1000);

    options.token = token_info;

    if (options.config) {
      var json = defaults({}, options);

      delete json.argv;
      delete json.action;
      delete json.config;

      var filename = options.config;

      if (path.extname(filename) !== '.json') {
        filename += '.json';
      }

      fs.writeFile(filename, JSON.stringify(json, null, 2), function(err) {
        if (err) console.error('[ERROR]'.red, 'Save config file ' + filename.cyan + ' failed!');
      });
    }
    doAction(action, token_info.access_token);
  });
}

var exports = function(options) {
  if (options.help) {
    exports.helpInfo();
    return;
  }
  if (options.destination) API_ROOT = options.destination;

  options.appid = options.appid || process.env.WX_APPID;
  options.secret = options.secret || options.appsecret || process.env.WX_SECRET;

  var config = options.config;

  if (!options.appid && !options.secret && !options.config) {
    config = './wx_config.json';
  }

  if (config) {
    config = options.config = path.resolve(process.cwd(), config);
    try {
      config = require(config);
    } catch (e) {
      console.error('\n Config file must be an real json.'.red);
      throw e;
    }
    defaults(options, config);
  }

  if (!options.appid || !options.secret) {
    console.error('\n  Must provide valid "appid" and "secret".'.red);
    exports.helpInfo();
    process.exit();
  }

  var remain = options.argv.remain;
  var action = remain[0] || '';
  action = action.replace(/^\-+/, '');

  if (action in aliases) {
    action = aliases[action];
  }
  options.action = action;

  if (action) return go(options);

  var list = ['get', 'delete'];

  console.log('');
  console.log('Choose your action:');
  program.choose(list, function(i) {
    options.action = list[i];
    go(options);
  });
};

exports.knowOpts = {
	destination: [String, null],
  config: String,
  appid: String,
  secret: String,
  help: Boolean,
};
exports.shortHands = {
  h: ['--help'],
  appsecret: ['--secret'],
  des: ['--destination']
};
exports.helpInfo = function() {
  console.log();
  console.log('  Usage: webot menu [action] [options]');
  console.log();
  console.log('  Actions: ');
  console.log();
  console.log('    # list      List all menu items (default)'); 
  console.log('    # create    Create a menu, need to pipe in a config json');
  console.log('    # delete    Delete the menu'); 
  console.log();
  console.log('  Options:');
  console.log();
  console.log('    --config    A json file to store configs, including the access_token info');
  console.log('    --appid     Your appid');
  console.log('    --secret    Your app secret');
  console.log('    --des       Request destination, defaults to https://api.weixin.qq.com/cgi-bin/');
  console.log();
  console.log('  Examples:');
  console.log();
  console.log('    webot menu list --appid=wx3kh4293htzkfm3 --secret=8f7a9f0sa9f8fg7136m');
  console.log('    webot menu create --config ./wx_config.json < ./wx_menu.json');
  console.log('');
};

function isValidToken(token) {
  if (typeof token !== 'object') {
    return false;
  }
  if (new Date(token.expire_date) > new Date()) {
    return true;
  }
  return false;
}

function defaults(a, b) {
  for (var k in b) {
    if (!a[k]) {
      a[k] = b[k];
    }
  }
  return a;
}

module.exports = exports;
