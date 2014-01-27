'use strict';

console.log(__dirname);

var model = require('../../../lib/model.js');

var PersonModel = require('../shared/models.js').PersonModel;
var ProfileModel = require('../shared/models.js').ProfileModel;


// init database connection
var mongojs = require('mongojs');
var db = mongojs('mongodb://127.0.0.1/test');
var connector = model.MongoConnector(db);

// init webserver
var express = require('express');
var app = express();
var port = 6123;
app.use(express.logger());
app.use(express.bodyParser());
app.set('json spaces',2);
app.listen(port);

console.log("Server running at Port", port);

var cleanCollection = function(name) {
  db.collection(name).drop(function(err, res) {
    console.log("Collection '"+name+"' cleaned");
  });
}

cleanCollection("Person");
PersonModel.connection(connector);
PersonModel.express(app);
PersonModel.serve();

cleanCollection("Profile");
ProfileModel.connection(connector);
ProfileModel.express(app);
ProfileModel.serve();


