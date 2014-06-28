
/**
 * Module dependencies.
 */

var express = require('express'),
    RedisStore = require('connect-redis')(express),
    redisClient = require('redis').createClient(),
    routes = require('./routes'),
    http = require('http'),
    path = require('path'),
    sessionGenerator = require('./src/sessionGenerator'),
    sessionStore = new RedisStore({
        host: 'localhost',
        port: 6379,
        db: 2
    }),
    WhosOnline = require('./src/WhosOnline'),
    app = express(),
    server = http.createServer(app),
    errorHandler = require('./src/errorHandler');

app.engine('html', require('hogan-express'));
app.enable('view cache');

app.configure(function(){
  app.set('port', process.env.PORT || 3100);
  app.set('view engine', 'html');
  app.set('partials', {head: 'head', footer: 'footer', leftcolumn: 'leftcolumn'});
  app.use(express.favicon(__dirname + '/public/favicon.ico'));
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('0rly?YA,rly!'));

  app.use(express.static(path.join(__dirname, 'public')));

  app.use(express.session({
      store: sessionStore,
      secret: '0mg!Wtf?bbQ!',
      reapInterval: 60*60*1000
  }));

  app.use(function(req, res, next){
    if(req.session.user && req.session.user.username){
      WhosOnline.setOnline(req.session.user.username);
    }
    next();
  });

  app.use(routes());
  app.use(errorHandler);
  WhosOnline.setStore(redisClient);
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

server.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
