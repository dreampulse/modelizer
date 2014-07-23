/**
 *  The Modelizer node.js implementation
 *  (This runs on the server)
 */


var Model = require('./model');

var Q = require('q');

var assert = require('./microlibs').assert;
var check = require('./microlibs').check;
var isEmptyObject = require('./microlibs').isEmptyObject;

var ObjectId = require('./objectid');


// The Storage-System using Mongo-DB
Model.MongoConnector = function (databaseConnection) {
  var db = databaseConnection;

  return function (theModel) {
    var collection = db.collection(theModel.modelName);

    // extensions for operation & factory call
    collection.callOperation = function (opName, params, HTMLrequest) {
      var deferred = Q.defer();

      var res;
      if (theModel.operations.hasOwnProperty(opName)) {  // call is an operation
        res = theModel.operationImpls[opName](params, HTMLrequest);
      } else if (theModel.factorys.hasOwnProperty(opName)) {  // call is a factory
        res = theModel.factoryImpls[opName](params, HTMLrequest);
      } else {
        assert(false, "Call '" + opName + "' was not defined");
      }

      if (res != undefined && res.name == 'promise') return res;  // if the function already returns a promise
      deferred.resolve(res);
      return deferred.promise;
    };

/*    // findOne overwrite - workaround for Bug #10
    collection.findOne = function (search, callback) {
      collection.find(search, function (err, docs) {
        if (err) {
          callback(err, docs);
          return;
        }
        if (docs.length < 1) {
          callback(err, null);
          return;
        }
        callback(err, docs[0]);
      });
    };
*/
    return collection;  // the collection for this model
  }
};


// setup webserver stuff
Model.prototype.express = function(app) {
  this.app = app;
};


Model.prototype.serve = function () {
  var self = this;

  // filter to allow cross origin requests
  this.app.all('*', function (req, res, next) {
    res.header('Access-Control-Allow-Credentials', true);
    //res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Methods', 'OPTIONS,GET,POST,PUT,DELETE');
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    if ('OPTIONS' == req.method) {
      return res.send(200);
    }
    next();
  });


  // REST - GET all
  this.app.get('/' + this.modelName + '/all', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    self.filtered_allQ(req)
      .then(function (docs) {
        // pack data for transport
        for (var i = 0; i < docs.length; i++) {
          self._transform(self, docs[i], "pack");
        }
        res.send(JSON.stringify(docs, null, 2));
      })
      .fail(function (err) {
        if (!err.statusCode) console.log("Error in HTTP GET - all()\n", err.message, "\nStack:\n", err.stack);
        res.send(err.statusCode || 500, {error: err.message});
      }).done();
  });

  /*
   * Security Issue
   * transform ObjectID!!
   */

  // REST - GET find
  this.app.post('/' + this.modelName + '/find', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    self.filtered_findQ(req.body, req)
      .then(function (docs) {
        // pack data for transport
        for (var i = 0; i < docs.length; i++) {
          self._transform(self, docs[i], "pack");
        }
        res.send(JSON.stringify(docs, null, 2));
      })
      .fail(function (err) {
        if (!err.statusCode) console.log("Error in HTTP GET - find()\n", err.message, "\nStack:\n", err.stack);
        res.send(err.statusCode || 500, {error: err.message});
      }).done();
  });


  // REST - GET id
  this.app.get('/' + this.modelName + '/:id', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    self.filtered_getQ(req.params.id, req)
      .then(function (doc) {
        // pack data for transport
        self._transform(self, doc, "pack");
        res.send(JSON.stringify(doc, null, 2));
      })
      .fail(function (err) {
        if (!err.statusCode) console.log("Error in HTTP GET - get()\n", err.message, "\nStack:\n", err.stack);
        res.send(err.statusCode || 500, {error: err.message});
      }).done();
  });

  // REST - save doc
  this.app.put('/' + this.modelName, function (req, res) {
    assert(req.body != undefined, "request body missing! Use bodyParser!");

    res.setHeader('Content-Type', 'application/json');

    // client sendet obj._id als string ->  in ObjectId umwandeln
    if (req.body._id != undefined) {
      try {
        req.body._id = ObjectId(req.body._id);
      } catch (e) {
        res.send(err.statusCode || 400, {error: "Invalid ObjectId Format"});
        return;
      }
    }

    // unpack data for storage
    self._transform(self, req.body, "unpack");

    self.filtered_saveQ(req.body, req)
      .then(function (doc) {
        res.send(JSON.stringify(doc, null, 2));
      })
      .fail(function (err) {
        if (!err.statusCode) console.log("Error in HTTP GET - save()\n", err.message, "\nStack:\n", err.stack);
        res.send(err.statusCode || 500, {error: err.message});
      }).done();
  });

  // REST - remove doc
  this.app.delete('/' + this.modelName + '/:id', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    self.filtered_removeQ(req.params.id, req)
      .then(function () {
        res.send(200, {status:"OK"});
      })
      .fail(function (err) {
        if (!err.statusCode) console.log("Error in HTTP GET - remove()\n", err.message, "\nStack:\n", err.stack);
        res.send(err.statusCode || 500, {error: err.message});
      }).done();
  });


  // REST - PUT operation
  this.app.put('/' + this.modelName + '/:op', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    assert(req.body != undefined, "No body in request!");
    self.filtered_callOpQ(req.params.op, req.body, req)
      .then(function (result) {
        if (typeof result != 'object') {
          result = {"result":result};
        }

        res.send(200, result);
      })
      .fail(function (err) {
        if (!err.statusCode) console.log("Error in HTTP GET - operation()\n", err.message, "\nStack:\n", err.stack);
        res.send(err.statusCode || 500, {error: err.message});
      }).done();

  });

};


// use default get
Model.prototype.filtered_getQ = function (id_str, req) {
  var id;

  try {
    id = ObjectId(id_str);
  } catch (e) {
    var deferred = Q.defer();
    deferred.reject(new Error("Invalid ObjectId Format"));
    return deferred.promise;
  }

  return this.filtered_findQ({_id: id}, req)
    .then(function (docs) {
      if (docs.length != 1) {
        var deferred = Q.defer();
        deferred.reject(new Error("Object not found!"));
        return deferred.promise;
      }

      return docs[0];
    });
};


Model.prototype.filtered_findQ = function (search, req) {
  var self = this;

  return this._getReadFilter(req)
    .then(function(filter) {
      if (filter === false) {  // deny all
        var deniedError = new Error("Access denied!");
        deniedError.statusCode = 401;
        throw deniedError;
      }

      // copy
      for (var i in filter) {  // erweitere die Suche um den filter
        search[i] = filter[i];
        // Achtung: security! Suche muss mit Filterkriterien überschrieben werden!!
      }

      // weiterrichen an die eigentliche Suche
      return self.findQ(search);

    });
};


Model.prototype.filtered_allQ = function (req) {
  return this.filtered_findQ({}, req);
};


Model.prototype.filtered_saveQ = function (obj, req) {
  // TODO: ich übergebe da eigentlich ein doc kein obj!!

  var self = this;

  return this._getWriteFilter(obj, req)
    .then(function(filter) {
      if (filter === false) {  // deny all
        var deniedError = new Error("Access denied!");
        deniedError.statusCode = 401;
        throw deniedError;
      }

      // TODO: der Filter muss irgendwie angewand werden -> da braucht es noch ein Konzept
      //      // copy
      //      for (var i in filter) {  // erweitere die Suche um den filter
      //        search[i] = filter[i];
      //        // Achtung: security! Suche muss mit Filterkriterien überschrieben werden!!
      //      }


      // weiterrichen an den Aufruf
      return self.saveQ(obj);
    });


};


Model.prototype.filtered_removeQ = function (id_str, req) {
  var self = this;
  var deferred = Q.defer();

  var id;
  try {
    id = ObjectId(id_str);
  } catch (e) {
    deferred.reject(new Error("Invalid ObjectId Format"));
    return deferred.promise;
  }

  return self.getQ(id)
    .then(function (obj) {
      return Q(self._getWriteFilter(obj, req));
    })
    .then(function(filter) {

      if (filter === false) {  // deny all
        var deniedError = new Error("Access denied!");
        deniedError.statusCode = 401;
        throw deniedError;
      }

      // weiterrichen an den Aufruf
      return self.removeQ(id);
    })
};


Model.prototype.filtered_callOpQ = function (operationName, params, HTMLrequest) {
  // todo security
  // todo: assure that operationName is in this.operations (security)
  return this.callOpQ(operationName, params, HTMLrequest);
};


Model.runSimpleServer = function(dir, port, mongostr) {

  // init mongodb database connection
  var mongojs = require('mongojs');
  var db = mongojs(mongostr);

  // init express webserver
  var express = require('express');
  var app = express();

  app.use(express.logger());
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({
    secret: 'Session Secret',
    store: new express.session.MemoryStore
  }));

  // serve the Modelizer library
  app.use(express.static(__dirname));
  app.use(express.static(dir));

  app.set('json spaces',2);
  app.listen(port);

  Model.simpleServer = {};
  Model.simpleServer.app = app;
  Model.simpleServer.connector = Model.MongoConnector(db);

  console.log("Server setup at Port", port);
  //console.log("Server dir", __dirname)
};


module.exports = Model;