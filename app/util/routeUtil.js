var exp = module.exports;
var dispatcher = require('./dispatcher');
var ConsistentHash = require('./consistentHash');
//var logger = require('pomelo-logger').getLogger('info-log', __filename);

exp.chat = function(session, msg, app, cb) {
	// get all chat server
	var allChatServers = app.getServersByType('chat');
	// get channel type
	var channelType = session.get('rtype');
	if (!channelType) {
		channelType = 0;
	}
	// select chat server by channel type
	chatServers = [];
	for(var id in allChatServers){
		var server = allChatServers[id];
		if (server.channelType == channelType) {
			chatServers.push(server);
		}
	}

	if(!chatServers || chatServers.length === 0) {
		cb(new Error('can not find chat servers.'));
		return;
	}

	var res = dispatcher.dispatch(session.get('rid'), chatServers);
	//logger.info('chatRoute: msg[select chat] rid[%s] host[%s] port[%s] channeltype[%s] length[%s]', session.get('rid'), res.host, res.port, channelType, chatServers.length);

	cb(null, res.id);
};

exp.chatConsistentHash = function(session, msg, app, cb) {
	// get all chat server
	var allChatServers = app.getServersByType('chat');
	// get channel type
	var channelType = session.get('rtype');
	if (!channelType) {
		channelType = 0;
	}
	// select chat server by channel type
	chatServers = [];
	for(var id in allChatServers){
		var server = allChatServers[id];
		if (server.channelType == channelType) {
			chatServers.push(server);
		}
	}

	if(!chatServers || !chatServers.length) {
		cb(new Error('can not find chat servers.'));
		return;
	}

	var opts = {
		replicas: '100',  //虚拟节点数量
		algorithm: 'md5'  //hash算法
	};
	var con = new ConsistentHash(chatServers, opts);
	var res = con.getNode(session.get('rid'));
	//logger.info('chatRoute: msg[select chat] rid[%s] host[%s] port[%s] channeltype[%s] length[%s]', session.get('rid'), res.host, res.port, channelType, chatServers.length);

	cb(null, res.id);
}