var pomelo = require('pomelo');
var routeUtil = require('./app/util/routeUtil');
var abuseFilter = require('./app/util/abuseFilter');
var httpPlugin = require('pomelo-http-plugin');
var path = require('path');

/**
 * Init app for client.
 */
var app = pomelo.createApp();
app.set('name', 'chatofpomelo');

var logger = require('pomelo-logger');
logger.configure(app.getBase()+'/config/log4js.json', {
    serverId: app.getServerId(),
    base: app.getBase()
});

// app configure
app.configure('production|development|backup|scale', function() {
	// route configures
	app.route('chat', routeUtil.chatConsistentHash);

	// filter configures
	app.filter(pomelo.timeout());
    app.set('connectorConfig', {
        connector : pomelo.connectors.hybridconnector,
        useDict : true,
        useProtobuf : true,
        heartbeat : 15,
        disconnectOnTimeout : false,
        setNoDelay : true
    });

    app.set('errorHandler', function (err, msg, resp, session, next) {
        console.log(err, msg, resp, session);
        next();
    });

    app.loadConfigBaseApp('redis', 'redis.json');
    app.loadConfigBaseApp('forbid', 'forbid.json');
});

app.configure('production|development|backup|scale', 'master', function() {
    app.set('ssh_config_params', ['-p 4344', '-o Host=*', '-o GSSAPIAuthentication=no', '-o HashKnownHosts=no', '-o CheckHostIP=no', '-o StrictHostKeyChecking=no']);
});

app.configure('production|development|backup|scale', 'chat', function() {

    var chatRedisClient = require('./app/dao/redis/redis').init(app);
    app.set('chatRedisClient', chatRedisClient);

    app.filter(abuseFilter(app));
});

// http消息接口
app.configure('production|development|backup|scale', 'httpchat', function() {
    app.loadConfigBaseApp('httpConfig', 'http.json');
    app.use(httpPlugin, {
        http: app.get('httpConfig')[app.getServerType()]
    });
});


// 安全策略
/*app.configure('production|development|backup|scale', 'connector', function() {
    app.set('proxyConfig', {
        failMode : 'failsafe',
        retryTimes : 3,
        retryConnectTime : 5000
    });
});*/

// start app
app.start();

process.on('uncaughtException', function(err) {
	console.error(' Caught exception: ' + err.stack);
});
