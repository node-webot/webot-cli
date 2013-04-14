var prettyjson = require('prettyjson');

var message = require('../message');
var makeRequest = message.makeRequest;

var program = require('commander');

var typeAlias = {
  'i': 'image',
  'l': 'location',
  'loc': 'location',
  'e': 'event',
};

var exports = function(options) {
  if (options.help) {
    exports.helpInfo();
    return;
  }

	var env = process.env;
	var host = options.hots || '127.0.0.1';
	var default_port = (host === '0.0.0.0' || host === '127.0.0.1' || host === 'localhost') ? 3000: 80;
	var port = options.port || env.PORT || default_port;
	var route = options.route || '/';
	var url = options.destination || 'http://' + host + ':' + port + route;

  var remain = options.argv.remain;

  var type = remain[0] || '';
  var msg = remain.slice(1);

  type = type.replace(/^\-+/, '');
  if (type in typeAlias) {
    type = typeAlias[type];
  }

	var info = {
		sp: options.sp,
		user: options.user,
		type: type || 'text',
	};

	var sendRequest = makeRequest(url, options.token || env.WX_TOKEN || 'keyboardcat123');

  function send_text(text) {
    info.text = text || 'test';
    console.log('sending text'.cyan, info.text);
    console.log(sendRequest(info, cb));
  }

  function send_image(pic) {
    info.pic = pic || 'http://www.baidu.com/img/baidu_sylogo1.gif';
    console.log('sending image'.cyan,  info.pic.green);
    console.log(sendRequest(info, cb));
  }

  function send_location(lat, lng) {
    info.lat = lat || '23.08';
    info.lng = lng || '113.24';
    console.log('sending latitude:'.cyan, info.lat, ', longitude:'.cyan, info.lng);
    console.log(sendRequest(info, cb));
  }

  function send_event(event, eventKey) {
    info.event = event || 'subscribe';
    info.eventKey = eventKey || '';
    console.log('sending %s event with key %s'.cyan, info.event.green, info.eventKey.green);
    console.log(sendRequest(info, cb));
  }

	// 发送消息
	function run() {
    switch(info.type) {
      case 'text':
        if (msg[0]) return send_text(msg[0]);
        return program.prompt('Text: ', send_text);
      case 'image':
        if (msg[0]) return send_image(msg[0]);
        return program.prompt('Image url: ', send_image);
      case 'location':
        if (msg[0]) return send_location(msg[0], msg[1]);
        return program.prompt('Lat: ', function(lat) {
          program.prompt('Lng: ', function(lng) {
            send_latlng(lat, lng);
          });
        });
      case 'event':
        if (msg[0]) return send_event(msg[0], msg[1]);
        return program.prompt('Event type: ', function(event) {
          program.prompt('Event key:', function(eventKey) {
            send_event(event, eventKey);
          });
        });
      default:
        console.error('Unsupported message type.'.red);
        process.exit();
    }
	}

	//显示结果
	function cb(err, json) {
		if (err) {
      if (err.code === 'ECONNREFUSED') {
        console.error('Connection refused. Check your server destination.'.red);
      } else {
        console.error(String(err).red, json);
      }
		} else {
			console.log('Result: '.green);
			console.log(prettyjson.render(json));
		}
		console.log();

    // Message provided via command, exit after sent.
    if (msg.length) process.exit();

    run();
	}

	run();
};

exports.knowOpts = {
	destination: [String, null],
  token: [String, null],
	port: [Number, null],
	host: [String, null],
  route: [String, null],
  help: Boolean,
};

exports.shortHands = {
  h: ['--help'],
  des: ['--destination']
};
exports.helpInfo = function() {
  console.log();
  console.log('  Usage: webot send [type] [options] [message]');
  console.log();
  console.log('  Types: ');
  console.log();
  console.log('    # t, text            Send a text message (default)'); 
  console.log('    # i, image, pic      Send a image message'); 
  console.log('    # l, loc, location   Send a location message'); 
  console.log('    # e, event           Send a event message'); 
  console.log();
  console.log('  Options:');
  console.log();
  console.log('    --token          API token for wechat, defaults to `process.env.WX_TOKEN`');
  console.log('    --port           The port your service is listening at, defaults to `process.env.PORT`');
  console.log('    --host           Server hostname, defaults to 127.0.0.1');
  console.log('    --route          The subdirectory you are watching');
  console.log('    --des            Request destination, a full url');
  console.log('                     Will override host, port and route'); 
  console.log();
  console.log('  Examples:');
  console.log();
  console.log('    webot send --token abc123 --des http://example.com/webot');
  console.log('    webot send t Hello');
  console.log('');
};

module.exports = exports;
