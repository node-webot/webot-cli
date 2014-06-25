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

/**
 * To send message
 *
 * Options:
 *
 *    `silent` - when true, will not display response
 *    `verbose` - when true, will display request
 *    `input` - an Array of data arguments
 *
 */
var exports = function(options, done) {
  if (options.help) {
    exports.helpInfo()
    return
  }

  done = done || process.exit

	var env = process.env
	var host = options.host || '127.0.0.1'
	var default_port = (host === '0.0.0.0' || host === '127.0.0.1' || host === 'localhost') ? 3000: 80
	var port = options.port || env.PORT || default_port
	var route = options.route || '/'
	var url = options.destination || 'http://' + host + ':' + port + route

  var remain = options.argv ? options.argv.remain : options.input

  var type = remain[0] || ''
  var msg = remain.slice(1)

  var logResp = options.silent ? function() {} : console.log
  var log = options.verbose ? console.log : function() {}

  type = type.replace(/^\-+/, '')
  if (type in typeAlias) {
    type = typeAlias[type]
  }

	var info = {
		sp: options.sp,
		user: options.user,
	}

  var token = options.token || env.WX_TOKEN || 'keyboardcat123'
	var sendRequest = makeRequest(url, token, options.silent)

  function send_text(text) {
    info.type = 'text'
    info.text = text || 'test'
    log()
    log('Sending text:'.cyan, info.text)
    log(indent(sendRequest(info, next).magenta))
    log()
  }

  function send_image(pic) {
    info.type = 'image'
    info.pic = pic || 'http://www.baidu.com/img/baidu_sylogo1.gif'
    log('Sending image'.cyan,  info.pic.green)
    log(indent(sendRequest(info, next).magenta))
  }

  function send_location(lat, lng, label) {
    info.type = 'location'
    var data = info.data = {
      lat: lat || '39.90611',
      lng: lng || '116.39782',
      scale: 20,
      label: label
    }
    log('Sending latitude:'.cyan, data.lat, ', longitude:'.cyan, data.lng)
    log(indent(sendRequest(info, next).magenta))
  }

  function send_reportloc(lat, lng, precision) {
    lat = lat || '39.90611'
    lng = lng || '116.39782'
    precision = precision || '65.000000'
    send_event('LOCATION', { lat: lat, lng: lng, precision: precision })
  }

  function send_event(event, data) {
    info.type = 'event'
    info.event = event || 'subscribe'
    data = data || {}
    if ('string' == typeof data) {
      data = { eventKey: data }
    }
    info.data = data
    log('Sending %s event with data %j'.cyan, info.event.green, data)
    log(indent(sendRequest(info, next).magenta))
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
    switch(type) {
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
      case 'reportloc':
        if (msg[0]) return send_reportloc(msg[0], msg[1], msg[2])
        return prompt('Lat: ', function(lat) {
          prompt('Lng: ', function(lng) {
            send_reportloc(lat, lng)
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
          choices: ['image', 'location', 'text', 'event', 'scan', 'reportloc'],
          default: 'text',
          message: 'Choose message type'
        }, function(answer) {
          type = answer
          run()
        })
    }
	}

	//显示结果
	function next(err, json) {
		if (err) {
      if (err.code === 'ECONNREFUSED') {
        logResp('Connection refused. Check your server destination.'.red)
      } else if (err.raw) {
        logResp('[Bad Response]:'.red)
        logResp()
        logResp(err.raw)
        if (err.raw === 'Invalid signature') {
          logResp()
          logResp('Please check your token.'.yellow)
        }
      } else {
        logResp('[Request Error]:'.red)
        logResp(String(err))
      }
		} else {
			logResp('[Response]:'.cyan)
      logResp()
			logResp(indent(prettyjson.render(json)))
		}
		logResp()
    logResp('----------'.grey)

    // Message provided via command, exit after sent.
    if (msg.length) {
      return done()
    }
    // try accept input again
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
  console.log('    # reportloc          Send report location event')
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
