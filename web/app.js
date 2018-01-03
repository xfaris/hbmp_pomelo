var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var fs = require('fs');
var logger = require('morgan');
var fileStreamRotator = require('file-stream-rotator');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var signLibs = require("./libs/sign");

var routes = require('./routes/message');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// some set
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// create a rotating write stream
var logDirectory = path.join(__dirname, 'logs');
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);
var accessLogStream = fileStreamRotator.getStream({
  date_format: 'YYYYMMDD',
  filename: path.join(logDirectory, 'access-%DATE%.log'),
  frequency: 'daily',
  verbose: false
});
app.use(logger('combined', {stream: accessLogStream}));

if (app.get('env') === 'development') {
  app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    next();
  });
}

// check sign
app.use(function(req, res, next) {
  var sign = signLibs.checkSign(req.query);
  if (false === sign) {
    res.json({'ret':1, 'msg':'sign error'});
  } else {
    next();
  }
});

// route
app.use('/message', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
