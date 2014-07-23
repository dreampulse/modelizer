'use strict';

console.log('running at', __dirname);

// process uncaught Exceptions
process.on('uncaughtException', function(err) {
  console.log('Caught exception', err);
});


var model = require('../../../lib/modelizer.js');

// init database connection
var mongojs = require('mongojs');
var db = mongojs('mongodb://127.0.0.1/test');
var connector = model.MongoConnector(db);
var ObjectId = require('mongojs').ObjectId;

// init webserver
var express = require('express');
var app = express();
var port = 6123;
app.use(express.logger());
app.use(express.bodyParser());

app.use(express.cookieParser());
app.use(express.session({
  secret: 'something',
  store: new express.session.MemoryStore
}));

app.set('json spaces',2);
app.listen(port);

console.log("Server running at Port", port);

var cleanCollection = function(name) {
  db.collection(name).drop(function(err, res) {
    console.log("Collection '"+name+"' cleaned");
  });
}

// setup connection and express for all models
model.globalConnection = connector;
model.globalExpress = app;

cleanCollection("Person");
cleanCollection("Profile");
cleanCollection("Posting");
cleanCollection("Content");

var PersonModel = require('../shared/models.js').PersonModel;
var ProfileModel = require('../shared/models.js').ProfileModel;
var PostingModel = require('../shared/models.js').PostingModel;
var ContentModel = require('../shared/models.js').ContentModel;



// Server productive code

PersonModel.operationImpl("testOp", function(params, req) {
  if (req == null || req == undefined) throw new Error("Missing HTTP-Header");
  if (params.param1 != "testParam") throw new Error("invalid operation param");
  return {result:"someStuff"};
});

PersonModel.factoryImpl("getSpecialObject", function(params, req) {
  return PersonModel.findQ({age:18});  // return all object with a age of 18
});

/// Filter Testing

ContentModel.readFilter(function (req) {
  //console.log("req.session.auth", req.session.auth);
  console.log("req.session.user_id", req.session.user_id);
  return {_id : ObjectId(req.session.user_id)};
});

ContentModel.afterReadFilter(function(obj) {
  obj.afterRead = 'it worked!';
});

ContentModel.writeFilter(function(obj, req) {
   return req.session.auth == true;
});

ContentModel.operationImpl("register", function(params, req) {
  var newContent = ContentModel.create();
  
  newContent.name = params.name;
  newContent.password = params.password;
  return newContent.saveQ();
});

ContentModel.operationImpl("login", function(params, req) {
  return ContentModel.findQ({name:params.name})
    .then(function(objs) {
      if (objs.length != 1) throw new Error("wrong search results");
      if (objs[0].password == params.password) {
        // auth successfull
        req.session.auth = true;
        req.session.user_id = objs[0]._id;
        console.log("save id", req.session.user_id);
      }
    })
});


// logout
ContentModel.operationImpl("logout", function(params, req) {
  delete req.session.auth;
  delete req.session.user_id;
});


ContentModel.operationImpl("cleanup", function(params, req) {
  console.log("Clean database");
  
  cleanCollection("Person");
  cleanCollection("Profile");
  cleanCollection("Posting");
  cleanCollection("Content");
});

