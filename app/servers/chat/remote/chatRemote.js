var logger = require('pomelo-logger').getLogger('info-log', __filename);
var channelType = require('../../../util/channelType');
var roleType = require('../../../util/roleType');

module.exports = function(app) {
	return new ChatRemote(app);
};

var ChatRemote = function(app) {
	this.app = app;
	this.channelService = app.get('channelService');
};

/**
 * Add user into chat channel.
 *
 * @param {String} uid unique id for user
 * @param {String} sid server id
 * @param {String} rid channel id
 * @param {boolean} flag channel parameter
 *
 */
ChatRemote.prototype.add = function(usign, sid, rid, flag, rtype, role, ulevel, uname, classid, cb) {
	var channel = this.channelService.getChannel(rid, flag);
	var uid = usign.split('*')[0];
	var param = {
		route: 'onAdd',
		user: uid,
		info: {
			ulevel : ulevel,
			uname : uname,
			classid : classid
		}
	};

	// 支持重复加入，如connector进程挂掉
	var tuinfo = channel.getMember(usign);
	if (!!tuinfo && tuinfo['sid']!=sid) {
		var leaveRes = channel.leave(usign, tuinfo['sid']);
		// 向之前的连接发送一个离开消息
		this.channelService.pushMessageByUids({route: 'onKick', user: uid}, [{
			uid: usign,
			sid: tuinfo['sid']
		}]);
		logger.info('addUser: msg[change connector] usign[%s] rid[%s] newsid[%s] lastsid[%s] res[%s]', usign, rid, sid, tuinfo['sid'], leaveRes);
	}

	if (!! channel) {
		var addRes = channel.add(usign, sid);
		logger.info('addUser: msg[channel add] usign[%s] rid[%s] sid[%s] res[%s]', usign, rid, sid, addRes);
	}

	// send message and return user list
	if (rtype == channelType.getMainTeacherChannelType()) {
		//获取主讲老师id
		var mainTeacherId = rid.split('_')[0];
		var mainTeacherSign = mainTeacherId + '*' + rid;
		var mainTeacherInfo = channel.getMember(mainTeacherSign);
		if (!!mainTeacherInfo) {
			//仅向主讲老师发送加入消息
			this.channelService.pushMessageByUids(param, [{
				uid: mainTeacherSign,
				sid: mainTeacherInfo['sid']
			}]);
			logger.info('addUser: msg[send message] usign[%s] uid[%s] rid[%s] rtype[%s]', usign, uid, rid, rtype);
		}

		//判断是否广播人数
		var self = this;
		if (!! channel.noticeTime) {
			var nowTime = new Date().getTime();
			if (nowTime - channel.noticeTime > 30000) {
				channel.noticeTime = nowTime;
				setTimeout(function() {
					var userListInfo = self.get(rid, flag, false);
					channel.pushMessage({route: 'onNotice', length: userListInfo['length']});
					logger.info('onNotice: rid[%s] rtype[%s] length[%s]', rid, rtype, userListInfo['length']);
				}, 30000);
			}
		}
		else {
			channel.noticeTime = new Date().getTime();
			setTimeout(function() {
				var userListInfo = self.get(rid, flag, false);
				channel.pushMessage({route: 'onNotice', length: userListInfo['length']});
				logger.info('onNotice: rid[%s] rtype[%s] length[%s]', rid, rtype, userListInfo['length']);
			}, 30000);
		}

		//返回学生人数
		cb(null, this.get(rid, flag, false));
	}
	else if (rtype == channelType.getAssTeacherChannelType()) {
		//获取辅导老师id
		var assTeacherId = rid.split('_')[0];
		//向辅导老师和学生发送加入消息
		if (sid != 'visitor' && assTeacherId != uid) {
			channel.pushMessage(param);
			logger.info('addUser: msg[send message] usign[%s] uid[%s] rid[%s] rtype[%s]', usign, uid, rid, rtype);
		}

		//辅导老师返回学生列表,学生获得人数
		var userListInfo = {};
		if (assTeacherId == uid) {
			userListInfo = this.get(rid, flag, true);
		}
		else userListInfo = this.get(rid, flag, false);
		//在人数中除去辅导老师
		var assTeacherSign = assTeacherId + '*' + rid;
		if (!! channel.records[assTeacherSign]) {
			if (userListInfo['length'] > 0) {
				userListInfo['length'] = userListInfo['length'] - 1;
			}
		}

		//判断是否通知辅导老师成员列表
		var self = this;
		if (!! channel.noticeUserListTime) {
			var nowTime = new Date().getTime();
			if (nowTime - channel.noticeUserListTime > 30000) {
				channel.noticeUserListTime = nowTime;
				setTimeout(function() {
					var noticeUserListInfo = self.get(rid, flag, true);
					var noticeAssTeacherId = rid.split('_')[0];
					var noticeAssTeacherSign = noticeAssTeacherId + '*' + rid;
					var noticeAssTeacherInfo = channel.getMember(noticeAssTeacherSign);
					if (!! noticeAssTeacherInfo) {
						self.channelService.pushMessageByUids({route: 'onNoticeUserList', user_list: noticeUserListInfo}, [{
							uid: noticeAssTeacherSign,
							sid: noticeAssTeacherInfo['sid']
						}]);
						logger.info('onNoticeUserList: rid[%s] rtype[%s] length[%s]', rid, rtype, noticeUserListInfo['length']);
					}
				}, 30000);
			}
		} else {
			channel.noticeUserListTime = new Date().getTime();
			setTimeout(function() {
				var noticeUserListInfo = self.get(rid, flag, true);
				var noticeAssTeacherId = rid.split('_')[0];
				var noticeAssTeacherSign = noticeAssTeacherId + '*' + rid;
				var noticeAssTeacherInfo = channel.getMember(noticeAssTeacherSign);
				if (!! noticeAssTeacherInfo) {
					self.channelService.pushMessageByUids({route: 'onNoticeUserList', user_list: noticeUserListInfo}, [{
						uid: noticeAssTeacherSign,
						sid: noticeAssTeacherInfo['sid']
					}]);
					logger.info('onNoticeUserList: rid[%s] rtype[%s] length[%s]', rid, rtype, noticeUserListInfo['length']);
				}
			}, 30000);
		}

		//返回
		cb(null, userListInfo);
	}
	else if (rtype == channelType.getDefaultChannelType()) {
		channel.pushMessage(param);
		logger.info('addUser: msg[send message] usign[%s] uid[%s] rid[%s] rtype[%s]', usign, uid, rid, rtype);
		cb(null, this.get(rid, flag, true));
	}
	else if (rtype == channelType.getTeacherGroupChannelType()) {
		channel.pushMessage(param);
		logger.info('addUser: msg[send message] usign[%s] uid[%s] rid[%s] rtype[%s]', usign, uid, rid, rtype);
		cb(null, this.get(rid, flag, true));
	}
	else if (rtype == channelType.getReplayLiveChannelType()) {
		var isTeacher = false;
		//是否是值班老师
		if (!! role && role == roleType.getTeacherRoleType()) {
			isTeacher = true;
		}

		//发送加入消息
		if (!isTeacher) {
			channel.pushMessage(param);
			logger.info('addUser: msg[send message] usign[%s] uid[%s] rid[%s] rtype[%s]', usign, uid, rid, rtype);
		}

		//值班老师返回学生列表,学生获得人数
		var userListInfo = {};
		if (isTeacher) {
			userListInfo = this.get(rid, flag, true);
		}
		else userListInfo = this.get(rid, flag, false);
		cb(null, userListInfo);
	}
	else {
		cb(null, {users:[], length:0});
	}
};


/**
 * Duplicate Add user into chat channel.
 *
 * @param {String} uid unique id for user
 * @param {String} sid server id
 * @param {String} rid channel id
 * @param {boolean} flag channel parameter
 *
 */
ChatRemote.prototype.duplicateAdd = function(usign, sid, rid, flag, rtype, role, ulevel, uname, classid, cb) {
	var channel = this.channelService.getChannel(rid, flag);
	var uid = usign.split('*')[0];

	// send message and return user list
	if (rtype == channelType.getMainTeacherChannelType()) {
		//返回学生人数
		cb(null, this.get(rid, flag, false));
	} else if (rtype == channelType.getAssTeacherChannelType()) {
		//获取辅导老师id
		var assTeacherId = rid.split('_')[0];

		//辅导老师返回学生列表,学生获得人数
		var userListInfo = {};
		if (assTeacherId == uid) {
			userListInfo = this.get(rid, flag, true);
		} else userListInfo = this.get(rid, flag, false);
		//在人数中除去辅导老师
		var assTeacherSign = assTeacherId + '*' + rid;
		if (!! channel.records[assTeacherSign]) {
			if (userListInfo['length'] > 0) {
				userListInfo['length'] = userListInfo['length'] - 1;
			}
		}

		//返回
		cb(null, userListInfo);
	} else if (rtype == channelType.getDefaultChannelType()) {
		cb(null, this.get(rid, flag, true));
	} else if (rtype == channelType.getTeacherGroupChannelType()) {
		cb(null, this.get(rid, flag, true));
	} else if (rtype == channelType.getReplayLiveChannelType()) {
		var isTeacher = false;
		//是否是值班老师
		if (!! role && role == roleType.getTeacherRoleType()) {
			isTeacher = true;
		}

		//值班老师返回学生列表,学生获得人数
		var userListInfo = {};
		if (isTeacher) {
			userListInfo = this.get(rid, flag, true);
		}
		else userListInfo = this.get(rid, flag, false);
		cb(null, userListInfo);
	} else {
		cb(null, {users:[], length:0});
	}
};

/**
 * Get user from chat channel.
 *
 * @param {Object} opts parameters for request
 * @param {String} name channel name
 * @param {boolean} flag channel parameter
 * @return {Array} users uids in channel
 *
 */
ChatRemote.prototype.get = function(rid, flag, showList) {
	var users = [];
	var length = 0;
	var channel = this.channelService.getChannel(rid, flag);
	if( !! channel) {
		if (showList){
			var i, group;
			for (var sid in channel.groups) {
				if (sid == 'vistor') continue;
				group = channel.groups[sid];
				for (i = 0; i < group.length; i++) {
					users.push(group[i].split('*')[0]);
				}
			}
			length = users.length;
		}
		else {
			length = channel.getUserAmount();
			//去掉访客人数
			var group = channel.groups['visitor'];
			if (!! group) {
				length -= group.length;
			}
		}
	}

	logger.info('getUser: msg[get user list] length[%s] rid[%s]', length, rid);
	return {users:users, length:length};
};

/**
 * Kick user out chat channel.
 *
 * @param {String} uid unique id for user
 * @param {String} sid server id
 * @param {String} name channel name
 *
 */
ChatRemote.prototype.kick = function(usign, sid, rid, rtype, role, cb) {
	var channel = this.channelService.getChannel(rid, false);

	var uid = usign.split('*')[0];
	var param = {
		route: 'onLeave',
		user: uid
	};

	// leave channel
	if (!! channel) {
		// 踢出前判断是否是同一个connector
		var tuinfo = channel.getMember(usign);
		if (!!tuinfo && tuinfo['sid'] != sid) {
			logger.info('kickUser: msg[other connector] usign[%s] rid[%s] newsid[%s] lastsid[%s]', usign, rid, sid, tuinfo['sid']);
		} else {
			var leaveRes = channel.leave(usign, sid);
			logger.info('kickUser: msg[channel leave] usign[%s] rid[%s] sid[%s] res[%s]', usign, rid, sid, leaveRes);

			// send message
			if (rtype == channelType.getMainTeacherChannelType()) {
				// 获取主讲老师id
				var mainTeacherId = rid.split('_')[0];
				var mainTeacherSign = mainTeacherId + '*' + rid;
				var mainTeacherInfo = channel.getMember(mainTeacherSign);
				if (!!mainTeacherInfo) {
					this.channelService.pushMessageByUids(param, [{
						uid: mainTeacherSign,
						sid: mainTeacherInfo['sid']
					}]);
				}
				//判断是否广播人数
				var self = this;
				if (!! channel.noticeTime) {
					var nowTime = new Date().getTime();
					if (nowTime - channel.noticeTime > 30000) {
						channel.noticeTime = nowTime;
						setTimeout(function() {
							var userListInfo = self.get(rid, false, false);
							channel.pushMessage({route: 'onNotice', length: userListInfo['length']});
							logger.info('onNotice: rid[%s] rtype[%s] length[%s]', rid, rtype, userListInfo['length']);
						}, 30000);
					}
				}
				else {
					channel.noticeTime = new Date().getTime();
					setTimeout(function() {
						var userListInfo = self.get(rid, false, false);
						channel.pushMessage({route: 'onNotice', length: userListInfo['length']});
						logger.info('onNotice: rid[%s] rtype[%s] length[%s]', rid, rtype, userListInfo['length']);
					}, 30000);
				}
				logger.info('kickUser: msg[send message] usign[%s] uid[%s] rid[%s] rtype[%s]', usign, uid, rid, rtype);
			} else if (rtype == channelType.getAssTeacherChannelType()) {
				//获取辅导老师id
				var assTeacherId = rid.split('_')[0];
				//向辅导老师和学生发送加入消息
				if (sid != 'visitor' && assTeacherId != uid) {
					channel.pushMessage(param);
					logger.info('kickUser: msg[send message] usign[%s] uid[%s] rid[%s] rtype[%s]', usign, uid, rid, rtype);
				}
			} else if (rtype == channelType.getReplayLiveChannelType()) {
				var isTeacher = false;
				//是否是值班老师
				if (!! role && role == roleType.getTeacherRoleType()) {
					isTeacher = true;
				}

				//发送加入消息
				if (!isTeacher) {
					channel.pushMessage(param);
					logger.info('kickUser: msg[send message] usign[%s] uid[%s] rid[%s] rtype[%s]', usign, uid, rid, rtype);
				}
			} else {
				channel.pushMessage(param);
				logger.info('kickUser: msg[send message] usign[%s] uid[%s] rid[%s] rtype[%s]', usign, uid, rid, rtype);
			}
		}
	}

	cb(null, {uid: uid, rid: rid});
};


ChatRemote.prototype.sendSystemMsg = function(rid, from, target, contentArr, cb) {
	var channelService = this.app.get('channelService');

	//消息添加时间戳
	contentArr.sendTime = parseInt(new Date().getTime()/1000);
	var content = JSON.stringify(contentArr);

	var param = {
		route: 'onChat',
		msg: content,
		from: from,
		target: target
	};
	var channel = channelService.getChannel(rid, false);

	logger.info('send: msg[send system msg] rid[%s] from[%s] target[%s] content[%s]', rid, from, target, content);

	if (!! channel) {
		if (target == '*') {
			channel.pushMessage(param);
		} else {
			var tuid = target + '*' + rid;
			var tuinfo = channel.getMember(tuid);
			if (!!tuinfo) {
				channelService.pushMessageByUids(param, [{
					uid: tuid,
					sid: tuinfo['sid']
				}]);
			}
		}
	}

	cb(null, {sendtime : contentArr.sendTime});
};

ChatRemote.prototype.getUserList = function(rid, cb) {
	var channelService = this.app.get('channelService');
	var channel = channelService.getChannel(rid, false);

	var users = [];
	var length = 0;
	if (!! channel) {
		users = channel.getMembers();
		length = channel.getUserAmount();

		logger.info('send: msg[http get user list] rid[%s] length[%s]', rid, length);
		cb(null, {users:users, length:length});
	} else {

		logger.info('send: msg[http get user list] rid[%s] length[%s]', rid, length);
		cb(null, {users:users, length:length});
	}
};

ChatRemote.prototype.getUserStatus = function(rid, uidList, cb) {
	var channelService = this.app.get('channelService');
	var channel = channelService.getChannel(rid, false);

	var userStatus = new Array();
	if (!! channel) {
		for (var i = 0; i < uidList.length; i++) {
			var uid = uidList[i] + '*' + rid;
			var uinfo = channel.getMember(uid);
			if (!!uinfo) {
				userStatus.push({
					uid: uid,
					status: 1
				});
			} else {
				userStatus.push({
					uid: uid,
					status: 0
				});
			}
		}

		logger.info('send: msg[http get user status] rid[%s] uidList[%s]', rid, uidList);
		cb(null, {userStatus:userStatus});
	} else {

		logger.info('send: msg[http get user status] rid[%s] uidList[%s]', rid, uidList);
		cb(null, {userStatus:userStatus});
	}
};
