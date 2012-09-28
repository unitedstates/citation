// tiny API over Citation.js' find command

var Citation = require('./lib/citation');

var route = function(req, res) {
  var text = req.param("text");
  var options = req.param("options");

  if (text) {

    text = decodeURIComponent(text);

    var results = Citation.find(text, options);

    var json = JSON.stringify({
      results: results
    });
    
    if (req.query.callback) {
      json = "" + req.query.callback + "(" + json + ")";
    }

    res.set({'Content-Type': 'application/json'})
    res.send(json);
  } else {
    res.send("Include a block of text to scan for citations in the 'text' parameter.", 500);
  }
};



// server configuration

var express = require('express');
var app = module.exports = express();

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});


// GET or POST to the main route

app.get( '/citation/find.json', route);
app.post('/citation/find.json', route);



// Start server

var startServer = function() {
  app.listen(3000, function() {
    console.log("Express server listening on port 3000 in %s mode", app.settings.env);
  });
}

app.configure('development', function() {
  require('reloader')({
    watchModules: true,
    onReload: startServer
  });
});

app.configure('production', startServer);