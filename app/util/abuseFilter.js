module.exports = function(app) {
    return new Filter(app);
}

var logger = require('pomelo-logger').getLogger('info-log', __filename);

var Filter = function(app) {
    var forbidConfig = app.get('forbid');
    var ahoCorasick = require('node-aho-corasick');
    var words = forbidConfig.words;
    this.ac = new ahoCorasick();

    for (var key in words) {
        this.ac.add(words[key]);
    }
    this.ac.build();
    //logger.info("AhoCorasick build");
};

Filter.prototype.before = function (msg, session, next) {
    //logger.info("AhoCorasick search");
    try {
        var contentArr = JSON.parse(msg.content);
        //过滤消息
        if (contentArr.type == 'message' && contentArr.mes) {
            var res = this.ac.search(contentArr.mes);
            if (res && res.length > 0) {
                // 修改为星号的方式
                /*for (var key in res) {
                    contentArr.mes = contentArr.mes.replace(res[key], '***');
                }*/
                // 回执一个不合法消息的方式
                contentArr.type = 'abuseMessage';
            }
        }
        msg.content = JSON.stringify(contentArr);
    } catch(err) {
        logger.warn("abuse filter msg: [%s]", msg.content);
    }

    next();
};

Filter.prototype.after = function (err, msg, session, resp, next) {
    next(err);
};