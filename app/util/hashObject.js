var HashObject = function(rid, rtype) {
    this.values  = {
        "rid" : rid,
        "rtype" : rtype
    };
};

module.exports = HashObject;

HashObject.prototype.get = function(key) {
    return this.values[key];
};