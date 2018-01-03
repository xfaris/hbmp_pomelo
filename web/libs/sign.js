/**
 * Created by mengfankang on 16/8/20.
 */

var signAppConf   = require("../config/sign.json");
var crypto = require('crypto');

/*
 需要传入的参数: app_id, app_timestamp, app_uniqid, app_sign
 参数传入方式:   GET
 签名方式:      md5(app_timestamp=1400000000&app_uniqid=12er32r4&app_key=kdijejlkfkidjjkj)
 */
var checkSign = function (params) {
    var startTime = new Date().getTime();

    if (!params['app_id'] || !params['app_sign'] || !params['app_timestamp'] || !params['app_uniqid']) {
        return false;
    }
    if (Math.abs(parseInt(params['app_timestamp']) - startTime/1000) > 86400) {
        return false;
    }
    var appKey = getAppKeyByAppId(params['app_id']);
    if (false == appKey) {
        return false;
    }
    var sign   = createSign(params, appKey);
    if (sign != params['app_sign']) {
        return false;
    }

    return sign;
}

var createSign = function(params, appKey) {
    var arrParam = [
        "app_timestamp=" + params['app_timestamp'],
        "app_uniqid=" + params['app_uniqid']
    ];

    arrParam.sort();
    arrParam.push("app_key=" + appKey);

    var signStr = arrParam.join('&');
    return crypto.createHash('md5').update(signStr).digest('hex');
}

var getAppKeyByAppId = function(appId) {
    var appConf = signAppConf.app;
    for (var i = 0; i < appConf.length; i++) {
        if (appConf[i].app_id == appId) {
            return appConf[i].app_key;
        }
    }
    return false;
}

var checkPathInConf = function(path) {
    if( -1 == signAppConf.path.indexOf(path)) {
        return false;
    }
    return true;
}

exports.checkSign = checkSign;
exports.checkPathInConf = checkPathInConf;