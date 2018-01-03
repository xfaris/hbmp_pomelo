var dispatcher = require('../../../util/dispatcher');
var logger = require('pomelo-logger').getLogger('info-log', __filename);
var crc = require('crc');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

var handler = Handler.prototype;

/**
 * Gate handler that dispatch user to connectors.
 *
 * @param {Object} msg message from client
 * @param {Object} session
 * @param {Function} next next stemp callback
 *
 */

handler.queryEntry = function(msg, session, next) {
	var uid = msg.uid;
	if(!uid) {
		logger.warn('queryEntry: msg[bad uid] uid[%s]', uid);
		next(null, {
			code: 500,
            message: '请先登陆再连接'
		});
		return;
	}
	var retryTime = msg.retrytime;
	retryTime = parseInt(retryTime);
	// get all connectors
	var allConnectors = this.app.getServersByType('connector');
	// get channel type
	var channelType = msg.rtype;
	if (!channelType) {
		logger.warn('queryEntry: msg[error channel type] uid[%s]', uid);
		next(null, {
			code: 500,
			message: '请提供正确的频道类型'
		});
		return;
	}
	// get is visitor
	var userType = msg.utype;
	if (!!userType && userType == 1 && channelType != 4) {
		var res = allConnectors[0];
		for(var id in allConnectors){
			if (allConnectors[id].id == 'visitor') {
				res = allConnectors[id];
				break;
			}
		}
		logger.info('queryEntry: msg[select connector] uid[%s] sid[%s] host[%s] outerNet[%s] clientPort[%s] channelType[%s] retryTime[%s]', uid, res.id, res.host, res.outerNet, res.clientPort, channelType, retryTime);
		next(null, {
			code: 200,
			host: res.outerNet,
			port: res.clientPort
		});
	} else {
		var curServer = this.app.getCurServer();
		var cloudType = curServer.cloudType;
		var gateType = curServer.gateType;
		// select connector by channel type
		var connectors = [];
		for (var id in allConnectors) {
			var server = allConnectors[id];
			if (server.channelType == channelType && server.cloudType == cloudType) {
				connectors.push(server);
			}
		}

		var res = null;
		if (!connectors || connectors.length === 0) {
			logger.warn('queryEntry: msg[get all connectors fail] uid[%s] retryTime[%s]', uid, retryTime);
			next(null, {
				code: 500
			});
			return;
		}
		// select connector
		var index = Math.abs(crc.crc32(uid.toString())) % connectors.length;
		res = connectors[index];

		logger.info('queryEntry: msg[select connector] uid[%s] sid[%s] host[%s] outerNet[%s] clientPort[%s] connectorIndex[%s] connectorNum[%s] channelType[%s] retryTime[%s]', uid, res.id, res.host, res.outerNet, res.clientPort, index, connectors.length, channelType, retryTime);
		if (gateType == 'wss') {
			next(null, {
				code: 200,
				host: res.wssDomain,
				port: res.wssPort
			});
		} else {
			next(null, {
				code: 200,
				host: res.outerNet,
				port: res.clientPort
			});
		}
	}
};
