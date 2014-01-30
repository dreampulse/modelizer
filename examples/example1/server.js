'use strict';

/**
 * Example for using the Modelizer
 *
 * Created by Jonathan Häberle
 */


// using the the Modelizer library
var model = require('../../lib/model.js');


// importing our defined models
var myModels = require('./models.js');


// init mongodb database connection
var mongojs = require('mongojs');
var ObjectId = require('mongojs').ObjectId;
var db = mongojs('mongodb://127.0.0.1/example');

// get a mongodb database connector
var connector = model.MongoConnector(db);


// init express webserver
var express = require('express');
var app = express();
var port = 8080;
app.use(express.logger());
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({
  secret: 'Session Secret',
  store: new express.session.MemoryStore
}));

app.set('json spaces',2);
app.listen(port);

// server all static files in this directory (for index.html)
app.use(express.static(__dirname));
// serve the Modelizer library
app.use(express.static(__dirname+"/../../lib/"));

console.log("Server setup at Port", port);


// say that our model should use express and the database connector
myModels.UserModel.connection(connector);
myModels.UserModel.express(app);
myModels.UserModel.serve();



