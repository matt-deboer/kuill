var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var data = require('./data.json');
var fs = require('fs');

var app = express();

var templatesParent = path.join(__dirname, '../../..')

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function(req, res, next) {
  console.log(`Getting: ${req.path}`)
  if (req.path in data) {
    res.json(data[req.path]);
  } else if (req.path === '/templates') {
    let templates = []
    fs.readdirSync(path.join(templatesParent, '/templates')).forEach(file => {
      templates.push(file)
    })
    res.json(templates)
  } else if (req.path.startsWith('/templates') && fs.existsSync(path.join(templatesParent, req.path))) {
    res.sendFile(path.join(templatesParent, req.path));
  } else {
    // catch 404 and forward to error handler
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  }
})


// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
