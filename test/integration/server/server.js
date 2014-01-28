'use strict';

console.log(__dirname);

var model = require('../../../lib/model.js');

var PersonModel = require('../shared/models.js').PersonModel;
var ProfileModel = require('../shared/models.js').ProfileModel;
var PostingModel = require('../shared/models.js').PostingModel;

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

cleanCollection("Posting");
PostingModel.connection(connector);
PostingModel.express(app);
PostingModel.serve();


// Server productive code

PersonModel.operationImpl("testOp", function(params, req) {
  if (req == null || req == undefined) throw new Error("Missing HTTP-Header");
  if (params.param1 != "testParam") throw new Error("invalid operation param");
  return {result:"someStuff"};
});
