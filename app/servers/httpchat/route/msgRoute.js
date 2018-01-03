var httpLogger = require('pomelo-logger').getLogger('http-log', __filename);
var hashObject = require('../../../util/hashObject');

module.exports = function(app, http) {
    http.post('/sendMsg', function(req, res) {
        var query = req.body;

        if (query.rid && query.content && query.from && query.target && query.rtype) {
            var rid = query.rid;
            var rtype = query.rtype;
            var from = query.from;
            var target = query.target;
            var content = query.content;

            try {
                var contentArr = JSON.parse(content);

                var hObj = new hashObject(rid, rtype);

                app.rpc.chat.chatRemote.sendSystemMsg(hObj, rid, from, target, contentArr, function (err, data) {
                    httpLogger.info('httpRequest: url[sendMsg] data[%s]', JSON.stringify(data));
                });

                res.send({"code": 0, "msg": "success"});
            } catch (err) {
                res.send({"code": -2, "msg": "content json parse fail"});
            }
        } else {
            res.send({"code" : -1, "msg" : "missing parameter"});
        }
    });

    http.post('/getUserList', function(req, res) {
        var query = req.body;

        if (query.rid && query.rtype) {
            var rid = query.rid;
            var rtype = query.rtype;

            var hObj = new hashObject(rid, rtype);

            app.rpc.chat.chatRemote.getUserList(hObj, rid, function (err, data) {
                res.send({"code": 0, "msg": "success", "data": data});
            });
        } else {
            res.send({"code" : -1, "msg" : "missing parameter", "data": []});
        }
    });

    http.post('/getUserStatus', function(req, res) {
        var query = req.body;

        if (query.rid && query.rtype && query.uids) {
            var rid = query.rid;
            var rtype = query.rtype;
            var uids = query.uids;

            var uidList = uids.split(",");
            if (uidList.length > 0) {
                var hObj = new hashObject(rid, rtype);

                app.rpc.chat.chatRemote.getUserStatus(hObj, rid, uidList, function (err, data) {
                    res.send({"code": 0, "msg": "success", "data": data});
                });
            } else {
                res.send({"code" : -1, "msg" : "missing parameter", "data": []});
            }
        } else {
            res.send({"code" : -1, "msg" : "missing parameter", "data": []});
        }
    });
};