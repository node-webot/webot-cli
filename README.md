# webot-cli

Command line interface for [weixin-robot](https://github.com/node-webot/weixin-robot).

    npm install webot-cli -g

## Commands

```man
  Usage: webot send [type] [options] [message]

  Types:

    # t, text            Send a text message (default)
    # i, image, pic      Send a image message
    # l, loc, location   Send a location message
    # e, event           Send a event message

  Options:

    --token          API token for wechat, defaults to `process.env.WX_TOKEN`
    --port           The port your service is listening at, defaults to `process.env.PORT`
    --host           Server hostname, defaults to 127.0.0.1
    --route          The subdirectory you are watching
    --des            Request destination, a full url
                     Will override host, port and route

  Examples:

    webot send --token abc123 --des http://wechat.example.com/
    webot send t Hello
```

Use `webot help` for more details.

### 微信自定义菜单

需要一个 json 文件保存 access_token 等配置信息。为安全起见，建议你只在本地使用此文件，不要把它放到代码仓库中。

在当前目录新建 **wx_config.json** ：

```javascript
{
  "appid": "abcedfe123456",
  "secret": "abcdefghijklmn1234567890"
}
```

#### 创建或修改

按照微信文档中的[请求示例][1]，新建一个 json 文件（如`menu.json`），然后利用 stdin 传入 `webot menu create` 命令：

文件 **menu.json** 的内容：

```javascript
 {
     "button":[
     {  
          "type":"click",
          "name":"今日歌曲",
          "key":"V1001_TODAY_MUSIC"
      },
      {
           "type":"click",
           "name":"歌手简介",
           "key":"V1001_TODAY_SINGER"
      },
      {
           "name":"菜单",
           "sub_button":[
            {
               "type":"click",
               "name":"hello word",
               "key":"V1001_HELLO_WORLD"
            },
            {
               "type":"click",
               "name":"赞一下我们",
               "key":"V1001_GOOD"
            }]
       }]
 }
```

执行命令：

    webot menu create --config wx_config.json < menu.json

### 自定义菜单与 webot 的结合

发送文字消息或者触发点击事件都可以：

```
var reg_gequ = /(今日歌曲|today music)/i;

webot.set('today_music', {
  pattern: function(info) {
    return reg_gequ.test(info.text) || info.param.eventKey === 'V1001_TODAY_MUSIC';
  },
  handler: function(info, cb) {
    // 从你的数据库里查找今日歌曲
    cb(null, {
      type: 'music',
      musicUrl: 'http://xxxx...',
      hqMusicUrl: 'http://xxxx...'
    });
  },
});
```

## LICENCE

(the MIT licence)

[1]:http://mp.weixin.qq.com/wiki/index.php?title=%E8%87%AA%E5%AE%9A%E4%B9%89%E8%8F%9C%E5%8D%95%E6%8E%A5%E5%8F%A3#.E8.8F.9C.E5.8D.95.E5.88.9B.E5.BB.BA)
