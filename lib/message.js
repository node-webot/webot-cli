var xml2js = require('xml2js');
var xmlParser = new xml2js.Parser();
var _ = require('lodash')._;
var request = require('request');
var crypto = require('crypto');

var exports = {};
/**
 * @method makeAuthQuery 组装querystring
 * @param {String} token 在微信公共平台后台填入的 token
 */
exports.makeAuthQuery = function(token, timestamp, nonce){
  var obj = {
    token: token,
    timestamp: timestamp || new Date().getTime().toString(),
    nonce: nonce || parseInt((Math.random() * 10e10), 10).toString(),
    echostr: 'echostr_' + parseInt((Math.random() * 10e10), 10).toString()
  };

  var s = [obj.token, obj.timestamp, obj.nonce].sort().join('');
  obj.signature = crypto.createHash('sha1').update(s).digest('hex');
  return obj;
};

exports.makeRequest = function(url, token, silent){
  var qs = exports.makeAuthQuery(token);

  if (!silent) {
    console.log('API URL:'.cyan, url.green);
    console.log('TOKEN:'.cyan, token.yellow);
  }

  return function(info, cb){
    //默认值
    info = _.isString(info) ? {text: info} : info;

    _.defaults(info, {
      sp: 'webot',
      user: 'client',
      type: 'text',
      text: 'help',
      pic: 'http://www.baidu.com/img/baidu_sylogo1.gif',
      label: 'this is a location'
    });

    var content = exports.info2xml(info);

    //发送请求
    request.post({
      url: url,
      qs: qs,
      body: content
    }, function(err, res, body){
      if (err || res.statusCode == '403' || !body){
        cb(err || res.statusCode, body);
      } else {
        xmlParser.parseString(body, function(err, result){
          if (err || !result || !result.xml) {
            err = err || new Error('result format incorrect');
            err.raw = body;
            cb(err, result);
          } else {
            var json = result.xml;
            if (json.MsgType == 'news') {
              json.ArticleCount = Number(json.ArticleCount);
            }
            cb(err, json);
          }
        });
      }
    });
    return content;
  };
};

/**
 * @property {String} tpl XML模版
 */
exports.info2xml = _.template([
  '<xml>',
    '<MsgId>1234567</MsgId>',
    '<ToUserName><![CDATA[<%= sp %>]]></ToUserName>',
    '<FromUserName><![CDATA[<%= user %>]]></FromUserName>',
    '<CreateTime><%= Math.floor(new Date().getTime() / 1000) %></CreateTime>',
    '<MsgType><![CDATA[<%= type %>]]></MsgType><% if(type=="text"){ %>',
      '<Content><![CDATA[<%= text %>]]></Content>',
    '<% }else if(type=="location"){ %>',
      '<Location_X><%= data.lat %></Location_X>',
      '<Location_Y><%= data.lng %></Location_Y>',
      '<Scale><%= data.scale %></Scale>',
      '<Label><![CDATA[<%= data.label %>]]></Label>',
    '<% }else if(type=="event"){  %>',
      '<Event><![CDATA[<%= event %>]]></Event>',
      '<% if (data.eventKey) {  %>',
        '<EventKey><![CDATA[<%= data.eventKey %>]]></EventKey>',
      '<% } ; if (data.lat) {  %>',
        '<Latitude><![CDATA[<%= data.lat %>]]></Latitude>',
        '<Longitude><![CDATA[<%= data.lng %>]]></Longitude>',
        '<Precision><![CDATA[<%= data.precision %>]]></Precision>',
      '<% } %>',
    '<% }else if(type=="link"){  %>',
      '<Title><![CDATA[<%= title %>]]></Title>',
      '<Description><![CDATA[<%= description %>]]></Description>',
      '<Url><![CDATA[<%= url %>]]></Url>',
    '<% }else if(type=="image"){  %>',
      '<PicUrl><![CDATA[<%= pic %>]]></PicUrl>',
    '<% } %></xml>'
].join('\n'));

module.exports = exports;
