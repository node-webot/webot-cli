# webot-cli

Command line interface for [webot](https://github.com/node-webot/webot).

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

## LICENCE

(the MIT licence)
