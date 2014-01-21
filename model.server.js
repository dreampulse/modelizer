var model = require('./lib/model');

var StammdatenModel = require('./model.shared').StammdatenModel;

/*
  todo: model implementiert eine abstrakte read und write funktion
  der Mongo store implementiert diese
  und die filter werden vor jedem read/ write angewandt
 */
/*
StammdatenModel.readFilter(function (model, user) {
  return { "userId" : user.userId};
});

StammdatenModel.writeFilter(function(model, user) {
  return user == model.userId
});




StammdatenModel.operationImpl("resetPassword", function(model, user) {

});

*/

//StammdatenModel.readFilter(function () {
//  return true;
//});


//StammdatenModel.readFilter(function () {
//  return {userId : "foo"};
//});


// init database connection
var mongojs = require('mongojs');
var db = mongojs('mongodb://127.0.0.1/test');
var connector = model.MongoConnector(db);
StammdatenModel.connection(connector);


// init webserver
var express = require('express');
var app = express();
app.use(express.logger());
app.set('json spaces',2);

StammdatenModel.express(app);
StammdatenModel.serve();

app.listen(5000);

console.log("running!");

//StammdatenModel.mongoDB("foo");