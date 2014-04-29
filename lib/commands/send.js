var prettyjson = require('prettyjson')
var inquirer = require ('inquirer')
var program = require('commander')

var message = require('../message')
var makeRequest = message.makeRequest

var typeAlias = {
  'i': 'image',
  'pic': 'image',
  't': 'text',
  'l': 'location',
  'loc': 'location',
  'e': 'event',
}

function prompt(config, callback) {
  if ('string' == typeof config) {
    config = {
      message: config
    }
  }
  config.name = 'result'
  inquirer.prompt(config, function(answers) {
    callback(answers.result)
  })
}

function confirm(config, callback) {
  if ('string' == typeof config) {
    config = {
      message: config
    }
  }
  config.type = 'confirm'
  return prompt(config, callback)
}

function indent(text, space) {
  var ws = ''
  space = space || 4
  while(space) {
    space -= 1
    ws += ' '
  }
  return ws + text.split('\n').join('\n' + ws)
}

var exports = function(options) {
  if (options.help) {
    exports.helpInfo()
    return
  }

	var env = process.env
	var host = options.host || '127.0.0.1'
	var default_port = (host === '0.0.0.0' || host === '127.0.0.1' || host === 'localhost') ? 3000: 80
	var port = options.port || env.PORT || default_port
	var route = options.route || '/'
	var url = options.destination || 'http://' + host + ':' + port + route

  var remain = options.argv.remain

  var type = remain[0] || ''
  var msg = remain.slice(1)

  type = type.replace(/^\-+/, '')
  if (type in typeAlias) {
    type = typeAlias[type]
  }

	var info = {
		sp: options.sp,
		user: options.user,
		type: type,
	}

	var sendRequest = makeRequest(url, options.token || env.WX_TOKEN || 'keyboardcat123')

  function send_text(text) {
    info.text = text || 'test'
    console.log()
    console.log('Sending text:'.cyan, info.text)
    console.log(indent(sendRequest(info, cb).magenta))
    console.log()
  }

  function send_image(pic) {
    info.pic = pic || 'http://www.baidu.com/img/baidu_sylogo1.gif'
    console.log('Sending image'.cyan,  info.pic.green)
    console.log(indent(sendRequest(info, cb).magenta))
  }

  function send_location(lat, lng, label) {
    info.lat = lat || '39.90611'
    info.lng = lng || '116.39782'
    info.label = label
    console.log('Sending latitude:'.cyan, info.lat, ', longitude:'.cyan, info.lng)
    console.log(indent(sendRequest(info, cb).magenta))
  }

  function send_event(event, eventKey, data) {
    info.type = 'event'
    info.event = event || 'subscribe'
    info.eventKey = eventKey || ''
    if (data) {
      for (var k in data) {
        info[k] = data[k]
      }
    }
    console.log('Sending %s event with key %s'.cyan, info.event.green, info.eventKey.green)
    console.log(indent(sendRequest(info, cb).magenta))
  }

  function send_scan(scene, subscribed) {
    scene = scene || '101'
    if (subscribed) {
      send_event('SCAN', scene)
    } else {
      send_event('subscribe', 'qrscene_' + scene)
    }
  }

	// 发送消息
	function run() {
    switch(info.type) {
      case 'text':
        if (msg[0]) return send_text(msg[0])
        return prompt('Text: ', send_text)
      case 'image':
        if (msg[0]) return send_image(msg[0])
        return prompt('Image url: ', send_image)
      case 'location':
        if (msg[0]) return send_location(msg[0], msg[1], msg[2])
        return prompt('Lat: ', function(lat) {
          prompt('Lng: ', function(lng) {
            send_location(lat, lng)
          })
        })
      case 'event':
        if (msg[0]) return send_event(msg[0], msg[1])
        return prompt('Event type: ', function(event) {
          prompt('Event key: ', function(eventKey) {
            send_event(event, eventKey)
          })
        })
      case 'scan':
        if (msg[0]) return send_scan(msg[0], msg[1])
        return prompt('Scene ID: ', function(scene) {
          confirm('has subscribed? ', function(subscribed) {
            send_scan(scene, subscribed)
          })
        })
        break
      default:
        prompt({
          type: 'list',
          choices: ['image', 'location', 'text', 'event', 'scan'],
          default: 'text',
          message: 'Choose message type'
        }, function(answer) {
          info.type = answer
          run()
        })
    }
	}

	//显示结果
	function cb(err, json) {
		if (err) {
      if (err.code === 'ECONNREFUSED') {
        console.error('Connection refused. Check your server destination.'.red)
      } else if (err.raw) {
        console.error('[Bad Response]:'.red)
        console.error()
        console.error(err.raw)
        if (err.raw === 'Invalid signature') {
          console.error()
          console.error('Please check your token.'.yellow)
        }
      } else {
        console.error('[Request Error]:'.red)
        console.error(String(err))
      }
		} else {
			console.log('[Response]:'.cyan)
      console.log()
			console.log(indent(prettyjson.render(json)))
		}
		console.log()
    console.log('----------'.grey)

    // Message provided via command, exit after sent.
    if (msg.length) process.exit()

    run()
	}

	run()
}

exports.knowOpts = {
	destination: [String, null],
  token: [String, null],
  user: [String, null],
	port: [Number, null],
	host: [String, null],
  route: [String, null],
  help: Boolean,
}

exports.shortHands = {
  h: ['--help'],
  u: ['--user'],
  des: ['--destination']
}
exports.helpInfo = function() {
  console.log()
  console.log('  Usage: webot send [type] [options] [message]')
  console.log()
  console.log('  Types: ')
  console.log()
  console.log('    # t, text            Send text messages (default)')
  console.log('    # i, image, pic      Send image messages')
  console.log('    # l, loc, location   Send location messages')
  console.log('    # e, event           Send event messages')
  console.log('    # scan               Send scan QRcode event')
  console.log()
  console.log('  Options:')
  console.log()
  console.log('    --token          API token for wechat, defaults to `process.env.WX_TOKEN`')
  console.log('    --port           The port your service is listening at, defaults to `process.env.PORT`')
  console.log('    --host           Server hostname, defaults to 127.0.0.1')
  console.log('    --route          The subdirectory you are watching')
  console.log('    --des            Request destination, a full url')
  console.log('                     Will override host, port and route')
  console.log('    --user           FromUserName of this message.')
  console.log()
  console.log('  Examples:')
  console.log()
  console.log('    webot send --token abc123 --des http://example.com/webot')
  console.log('    webot send t Hello')
  console.log('    webot send loc 20.12 120.33 "Somewhere Out There"')
  console.log('')
}

module.exports = exports
