var net = require("net");
require('node-ka-patch');
var log4js = require("log4js");
log4js.configure({
    appenders: [
        { type: 'console' }, //控制台输出
        {
            type: 'file', //文件输出
            filename: 'logs/info-crossdomain.log',
            maxLogSize: 1048576,
            backups: 5,
            category: 'normal'
        }
    ],
    "replaceConsole": true
});

var logger = log4js.getLogger('normal');
var port = 80;

var netserver = net.createServer(function(socket){
    logger.info('connected: ip[%s] port[%s]', socket.remoteAddress, socket.remotePort);

    socket.addListener("error", function(err){
        socket.end && socket.end() || socket.destroy && socket.destroy();
        logger.info(err);
    });
    var xml = '<?xml version="1.0"?>\n<!DOCTYPE cross-domain-policy SYSTEM \n"http://www.adobe.com/xml/dtds/cross-domain-policy.dtd">\n<cross-domain-policy>\n';
    xml += '<allow-access-from domain="*.hbmp.com" to-ports="*"/>\n';
    xml += '</cross-domain-policy>\n';
    if(socket && socket.readyState == 'open'){
        socket.write(xml);
        socket.end();
    }

    socket.on('close', onSocketClose.bind(null, socket.remoteAddress, socket.remotePort));

    socket.setKeepAlive(true);
    socket.setNoDelay(true);
});
netserver.addListener("error", function(err){
    logger.info(err);
});
netserver.listen(port);

logger.info("started: port[%s]", port);

var onSocketClose = function(ip, port, data) {
    logger.info('closed: ip[%s] port[%s]', ip, port);
}
