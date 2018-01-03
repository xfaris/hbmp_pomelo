var ChannelType = module.exports;

var CHANNEL_TYPE_DEFAULT = 0;
var CHANNEL_TYPE_MAIN_TEACHER = 1;
var CHANNEL_TYPE_ASS_TEACHER = 2;
var CHANNEL_TYPE_TEACHER_GROUP = 3;
var CHANNEL_TYPE_REPLAY_LIVE = 4;

ChannelType.getDefaultChannelType = function() {
    return CHANNEL_TYPE_DEFAULT;
};

ChannelType.getMainTeacherChannelType = function() {
    return CHANNEL_TYPE_MAIN_TEACHER;
};

ChannelType.getAssTeacherChannelType = function() {
    return CHANNEL_TYPE_ASS_TEACHER;
};

ChannelType.getTeacherGroupChannelType = function() {
    return CHANNEL_TYPE_TEACHER_GROUP;
};

ChannelType.getReplayLiveChannelType = function() {
    return CHANNEL_TYPE_REPLAY_LIVE;
};