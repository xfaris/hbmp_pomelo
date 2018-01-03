var chatRemote = require('../remote/chatRemote');
var pomelo = require('pomelo');
var logger = require('pomelo-logger').getLogger('info-log', __filename);
var redisLogger = require('pomelo-logger').getLogger('redis-log', __filename);
var channelType = require('../../../util/channelType');
//var logCollector = require('pomelo-logger').getLogger('EVENT', __filename);

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

var handler = Handler.prototype;

/**
 * Send messages to users
 *
 * @param {Object} msg message from client
 * @param {Object} session
 * @param  {Function} next next stemp callback
 *
 */
handler.send = function(msg, session, next) {
	var rid = session.get('rid');
	var rtype = session.get('rtype');
	var username = session.uid.split('*')[0];
	var channelService = this.app.get('channelService');

	//消息添加时间戳
	try {
		var contentArr = JSON.parse(msg.content);
		contentArr.sendTime = parseInt(new Date().getTime()/1000);
		msg.content = JSON.stringify(contentArr);
	} catch(err) {
		logger.warn('jsonError: content[%s]', msg.content);
	}

	var param = {
		route: 'onChat',
		msg: msg.content,
		from: username,
		target: msg.target
	};
	channel = channelService.getChannel(rid, false);

	logger.info('send: msg[send message] rid[%s] from[%s] target[%s] content[%s]', rid, username, msg.target, msg.content);

	var isSend = true;
	/*if (contentArr.type == 'confirm' && contentArr.interact == 'teacheraskexercises') {
		logCollector.info('%j', {
			'request_id': 0,
			'event_user_id': username,
			'event_name': 'tb_confirm',
			'event_info': {
				'message': msg.content
			}
		});
		isSend = false;
	}*/

	if (! msg.target) {
		isSend = false;
	}

	if (!! channel && isSend == true) {
		if (msg.target == '*') {
			//the target is all users
			if (contentArr.type == 'abuseMessage') {
				var tuid = session.uid;
				var tuinfo = channel.getMember(tuid);
				if (!!tuinfo) {
					channelService.pushMessageByUids(param, [{
						uid: tuid,
						sid: tuinfo['sid']
					}]);
				}
			} else {
				channel.pushMessage(param);
			}
		} else if (msg.target.indexOf(",") > 0) {
			//the target is some users
			var targets = msg.target.split(",");
			var targetList = new Array();
			for (var i = 0; i < targets.length; i++) {
				var tuid = targets[i] + '*' + rid;
				var tuinfo = channel.getMember(tuid);
				if (!!tuinfo) {
					targetList.push({
						uid: tuid,
						sid: tuinfo['sid']
					});
				}
			}
			if (targetList.length > 0) {
				channelService.pushMessageByUids(param, targetList);
			}
		} else {
			//the target is specific user
			var tuid = msg.target + '*' + rid;
			var tuinfo = channel.getMember(tuid);
			if (!!tuinfo) {
				channelService.pushMessageByUids(param, [{
					uid: tuid,
					sid: tuinfo['sid']
				}]);
			}
		}

		//record other message
		try {
			var contentArr = JSON.parse(msg.content);

			if (contentArr.type == 'message' || contentArr.type == 'motion') {
				//离线存储消息格式
				var record = {
					rid: rid,
					rtype: rtype,
					msg: msg.content,
					from: username,
					target: msg.target
				};
				var recordJson = JSON.stringify(record);

				//聊天消息：区分群聊和私聊
				var listName = 'ChatMessage:' + rid + ':';
				var classListName = listName + contentArr.classRoomId;
				if (msg.target == '*') {
					listName = listName + 'Group';
					//群聊按班级分
					if (rtype == channelType.getAssTeacherChannelType()) {
						pomelo.app.get('chatRedisClient').execute(function(client, release) {
							client.expire(classListName, 604800);
							client.rpush(classListName, msg.content, function(err) {
								if (err) {
									redisLogger.error('[Redis Error] rpush %s', err.stack);
								}
								release();
							});
						});
					}

					pomelo.app.get('chatRedisClient').execute(function(client, release) {
						client.expire(listName, 604800);
						client.rpush(listName, msg.content, function(err) {
							if (err) {
								redisLogger.error('[Redis Error] rpush %s', err.stack);
							}
							release();
						});
					});
				} else {
					var siLiaoListName = 'ChatMessage:SiLiao';

					pomelo.app.get('chatRedisClient').execute(function(client, release) {
						client.expire(siLiaoListName, 604800);
						client.rpush(siLiaoListName, recordJson, function(err) {
							if (err) {
								redisLogger.error('[Redis Error] rpush %s', err.stack);
							}
							release();
						});
					});
				}

				//存储所有消息
				var teacherId = parseInt(rid.split('_')[0]);
				var allListName = 'ChatMessage:All:' + teacherId % 10;
				pomelo.app.get('chatRedisClient').execute(function(client, release) {
					client.rpush(allListName, recordJson, function(err) {
						if (err) {
							redisLogger.error('[Redis Error] rpush %s', err.stack);
						}
						release();
					});
				});
			}
		} catch(err) {
			redisLogger.warn('[Message Error][%s][%s]', msg.content, err.stack);
		}
	}

	next(null, {
		route: msg.route
	});
};