var RoleType = module.exports;

var ROLE_TYPE_DEFAULT = 0;
var ROLE_TYPE_STUDENT = 1;
var ROLE_TYPE_TEACHER = 2;
var ROLE_TYPE_MAIN_TEACHER = 4;
var ROLE_TYPE_USER = 3;
var ROLE_TYPE_GUEST = 5;

RoleType.getDefaultRoleType = function() {
    return ROLE_TYPE_DEFAULT;
};

RoleType.getStudentRoleType = function() {
    return ROLE_TYPE_STUDENT;
};

RoleType.getTeacherRoleType = function() {
    return ROLE_TYPE_TEACHER;
};

