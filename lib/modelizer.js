/**
 * Created by jonathan on 22.03.14.
 */


var Model = require('./model');

var serverImpl = require('./server');


// The Storage-System using Mongo-DB
Model.MongoConnector = serverImpl.MongoConnector;


// setup webserver stuff
Model.prototype.express = serverImpl.express;

Model.prototype.serve = serverImpl.serve;

Model.prototype.filtered_get = serverImpl.filtered_get;
Model.prototype.filtered_find = serverImpl.filtered_find;
Model.prototype.filtered_all = serverImpl.filtered_all;
Model.prototype.filtered_save = serverImpl.filtered_save;
Model.prototype.filtered_remove = serverImpl.filtered_remove;
Model.prototype.filtered_callOp = serverImpl.filtered_callOp;


Model.runSampleServer = serverImpl.runSampleServer;


module.exports = Model;