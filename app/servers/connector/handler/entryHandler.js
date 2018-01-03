var logger = require('pomelo-logger').getLogger('info-log', __filename);
var async = require('async');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

var handler = Handler.prototype;

/**
 * New client entry chat server.
 *
 * @param  {Object}   msg     request message
 * @param  {Object}   session current session object
 * @param  {Function} next    next stemp callback
 * @return {Void}
 */
handler.enter = function(msg, session, next) {
	var self = this;
	var rid = msg.rid;
	var rtype = msg.rtype;
	var usign = msg.username + '*' + rid;
	var sessionService = self.app.get('sessionService');
	var role = msg.role;
	var ulevel = msg.ulevel;
	var uname = msg.uname;
	var uid = msg.uid;
	var classid = msg.classid;

	/*//duplicate log in
	if( !! sessionService.getByUid(usign)) {
		logger.warn('enter: msg[kick start] usign[%s]', usign);
		sessionService.kick(usign, onSessionKick.bind(null, usign));
	}

	session.bind(usign);
	session.set('rid', rid);
	session.push('rid', onSessionPush.bind(null, usign));
	session.set('rtype', rtype);
	session.push('rtype', onSessionPush.bind(null, usign));
	session.on('closed', onUserLeave.bind(null, self.app));

	//put user into channel
	logger.info('enter: msg[add user into channel] usign[%s]', usign);
	self.app.rpc.chat.chatRemote.add(session, usign, self.app.get('serverId'), rid, true, rtype, function(usersInfo){
		next(null, usersInfo);
	});*/

	var existSessions = sessionService.getByUid(usign);
	async.waterfall([
		function(cb) {
			if (!! existSessions) {
				logger.warn('enter: msg[kick start] usign[%s]', usign);
				sessionService.duplicateLoginKick(usign, cb);
			} else {
				cb(null);
			}
		}, function(cb) {
			logger.info('enter: msg[session bind start] sid[%s] usign[%s]', session.id, usign);
			session.bind(usign, cb);
		}, function(cb) {
			session.set('rid', rid);
			session.set('rtype', rtype);
			session.set('role', role);
			session.set('ulevel', ulevel);
			session.set('uname', uname);
			session.set('classid', classid);
			session.on('closed', onUserLeave.bind(null, self.app));
			session.pushAll(cb);
		}, function(cb) {
			logger.info('enter: msg[add user into channel start] usign[%s]', usign);
			if (!existSessions) {
				self.app.rpc.chat.chatRemote.add(session, usign, self.app.get('serverId'), rid, true, rtype, role, ulevel, uname, classid, cb);
			} else {
				self.app.rpc.chat.chatRemote.duplicateAdd(session, usign, self.app.get('serverId'), rid, true, rtype, role, ulevel, uname, classid, cb);
			}
		}, function(usersInfo, cb) {
			logger.info('enter: msg[return user info] usign[%s] length[%s]', usign, usersInfo.length);
			next(null, usersInfo);

			return;
		}
	], function(err) {
		if (err) {
			next(err, {code: 500, error: true, message:'错误'});
			return;
		}
	});
};

/**
 * User log out handler
 *
 * @param {Object} app current application
 * @param {Object} session current session object
 *
 */
var onUserLeave = function(app, session) {
	if (!session || !session.uid) {
		logger.warn('leave: msg[close session fail]');
		return;
	}

	logger.info('leave: msg[close session ok] sid[%s] usign[%s]', session.id, session.uid);
	app.rpc.chat.chatRemote.kick(session, session.uid, app.get('serverId'), session.get('rid'), session.get('rtype'), session.get('role'), function(err, usersInfo){
		logger.info('leave: msg[rpc kick ok] uid[%s] rid[%s]', usersInfo.uid, usersInfo.rid);
	});
};

/*
var onSessionKick = function(usign) {
	logger.warn('enter: msg[kick over] usign[%s]', usign);
};

var onSessionPush = function(usign, err) {
	if(err) {
		logger.error('enter: msg[push session fail] usign[%s] error[%j]', usign, err.stack);
	}
};
*/