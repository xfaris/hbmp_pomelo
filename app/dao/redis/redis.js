var redisclient = module.exports;
var redisLogger = require('pomelo-logger').getLogger('redis-log', __filename);

var _pool;

var YYD = {};

YYD.init = function(app){
    _pool = require('./redis-pool').createRedisPool(app);
};

YYD.execute = function(cb){
    _pool.acquire(function(err, client) {
        if (!!err) {
            redisLogger.error('[Redis Error] pool acquire %s', err.stack);
            _pool.release(client);
            return;
        } else {
            cb(client, function() {
                _pool.release(client);
            });
        }
    });
};

YYD.shutdown = function(){
    _pool.destroyAllNow();
};

redisclient.init = function(app) {
    if (!!_pool){
        return redisclient;
    } else {
        YYD.init(app);
        redisclient.execute = YYD.execute;
        return redisclient;
    }
};

redisclient.shutdown = function(app) {
    YYD.shutdown(app);
};