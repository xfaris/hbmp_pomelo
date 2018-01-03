/**
 * Created by zhuangyingjie on 16/9/26.
 */

var express = require('express');
var router = express.Router();
var path = require('path');
var redisConf = require('../config/redis.json');

router.get('/getList', function(req, res, next) {
    var channelId = req.query.channelId;
    var from = req.query.fromUserId;
    var target = req.query.targetUserId;
    var page = req.query.page;
    var classRoomId = req.query.classroomId;

    var redis = require("redis");
    var client = redis.createClient(redisConf.port,redisConf.host);
    //client.auth(redisConf.password);

    client.on("error", function (err) {
        console.log("Error " + err);
    });

    //计算list名称
    var key = "ChatMessage:" + channelId + ':';
    if (!isNaN(target) && !isNaN(from)) {
        if (parseInt(target) < parseInt(from)) {
            key = key + target + '_' + from;
        } else {
            key = key + from + '_' + target;
        }
    } else {
        if (!isNaN(classRoomId)) {
            key = key + classRoomId;
        } else {
            key = key + 'Group';
        }
    }

    //计算start stop，num 每页个数
    var num = 20;
    var start = - num * page;
    var stop = -1 - num * (page - 1);
    client.lrange(key, start, stop, function (err, data) {
        var result = {
            'ret' : 0,
            'key' : key,
            'data': []
        };

        if(!err && data) {
            for (var key in data) {
                data[key] = JSON.parse(data[key]);
            }
            result['data'] = data;
        }

        client.quit();

        res.json(result);
    });
});

module.exports = router;