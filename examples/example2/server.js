'use strict';

/**
 * Example for using the Modelizer
 *
 * Created by Jonathan Häberle
 */


// using the the Modelizer library
var model = require('../../lib/modelizer.js');


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



//////////////////////////////////
// Server model implementation


// say that our model should use express and the database connector
myModels.UserModel.connection(connector);
myModels.UserModel.express(app);
myModels.UserModel.serve();

// setup filters for the UserModel
myModels.UserModel.readFilter(function(req) {
  return false;  // deny all read requests
});

myModels.UserModel.writeFilter(function(req) {
  return false;  // deny all write requests
});

// setup Operations for the model to register an user
myModels.UserModel.operationImpl("register", function(params, req) {
  var user = myModels.UserModel.createObject();
  user.username = params.username;
  user.password = params.password;

  // save the new user
  return user.save()
    .then(function() {  // if save was ok
      return {status:"ok"};
    })
    .fail(function(err) {  // if save failed
      return {error:err};
    });
});

// a operation to login a user
myModels.UserModel.operationImpl("login", function(params, req) {

  return myModels.UserModel.use.find({username:params.username})  // find this user
    .then(function(objs) {

      if (objs.length != 1) throw new Error("found more then one user");

      if (objs[0].password == params.password) { // auth successfull
        // remember in a sesson, that auth was sucessfull
        req.session.auth = true;
        // remember the user in the sesson
        req.session.user = objs[0]._id;
      }
    })

});



// say that our model should use express and the database connector
myModels.ContentModel.connection(connector);
myModels.ContentModel.express(app);
myModels.ContentModel.serve();

// setup filters
myModels.ContentModel.readFilter(function(req) {
  if (!req.session.auth) return false;  // if not logged in don't allow read operations

  return {owner:req.session.user};  // filter for only your documents
});

myModels.ContentModel.writeFilter(function(obj, req) {
  if (!req.session.auth) return false;  // if not logged in don't allow write operations

  obj.owner = req.session.user;  // set the owner of this document

  return true;  // filter passed
});



//////////////////////////////////