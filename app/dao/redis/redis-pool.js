var generic_pool = require('generic-pool');
var redis = require('redis');
var redisLogger = require('pomelo-logger').getLogger('redis-log', __filename);

/*
 * Create redis connection pool.
 */
var createRedisPool = function(app) {
    var redisConfig = app.get('redis');
    return generic_pool.Pool({
        name: 'redis',
        create: function (callback) {
            var client = redis.createClient(
                redisConfig.port,
                redisConfig.host
            );
            client.on('error', function (err) {
                redisLogger.error('[Redis Error] at connect redis: %s', err.stack);
            });
            if (redisConfig.password) {
                client.auth(redisConfig.password);
            }

            callback(null, client);
        },
        destroy: function (client) {
            client.quit();
        },
        max: 10,
        idleTimeoutMillis: 5000,
        log: false
    });
};

exports.createRedisPool = createRedisPool;