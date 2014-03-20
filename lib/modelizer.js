/**
  *   Modelizer - by Jonathan Haeberle
  *   https://github.com/dreampulse/modelizer
  */

////// Micro libs ////

function assert(condition, message) {
  if (!condition) {
    console.log('Assertion failed', message);
    console.trace();
    throw new Error(message || "Assertion failed");
  }
}

function check(condition, message) {
  if (!condition) {
    throw new Error(message || "Check failed");
  }
}

// http://stackoverflow.com/questions/679915/how-do-i-test-for-an-empty-javascript-object-from-json
function isEmptyObject(obj) {
  var name;
  for (name in obj) {
    return false;
  }
  return true;
}


////// Platform dependent code ///

// http://stackoverflow.com/questions/4224606/how-to-check-whether-a-script-is-running-under-node-js
if (typeof window === 'undefined') {
  // assume running in node environment
  var Q = require('q');
} else {
  // assume running in browser environment
  assert(Q !== undefined, 'Missing Q in the enviroment');
}

/////////////////////////
// All models which ever are being created
// not used so far
var AllModels = [];

//////////////////////////
// The Model implementation

var Model = function(modelName, schema) {
  this.self = this;

  this.modelName = modelName;
  this.schema = schema;

  // im scope der Model-Methode speichere ich alles was ich dem Modell übergeben kann
  // also Attribute, operationen usw..
  // die Funktionen hierfür sehen eigentlich immer gleich auch
  // deswegen sollte das auch in ein meta-modell wandern

  this.attrs = {};


  // a reference to another model
  this.attrRefs = {};

  // a reference to another model
  this.attrObjs = {};

  // an inline object
  this.methods = {};

  this.methodImpls = {};

  this.virtualAttrs = {};

  this.virtualAttrImpls = {};

  this.attrArrays = {};

  this.attrRefArrays = {};

  this.operations = {};

  this.operationImpls = {};

  this.factorys = {};

  this.factoryImpls = {};

  // setup filters for using the model
  this.readFilters = [];


  // setup write filters for using the model
  this.writeFilters = [];



  /////////////////
  // Constructing

  // 'execute' schema definition
  if (this.schema) { // a schema was provided
    this.processSchema(this.schema);
  }


  // set connection for all models
  if (Model.globalConnection) {
    this.connection(Model.globalConnection);
  }

  // set express for all models
  if (Model.globalExpress) {
    this.express(Model.globalExpress);
    this.serve();
  }


  // init sample Server
  if (Model.sampleServer) {
    console.log("init sample server for", this.modelName);

    // say that our model should use express and the database connector
    this.connection(Model.sampleServer.connector);
    this.express(Model.sampleServer.app);
    this.serve();
  }

  // store instance of this model
  AllModels.push(this);

  return this;
};



// "Subclasses"

// The Storage-System using Mongo-DB
Model.MongoConnector = function(databaseConnection) {
  var db = databaseConnection;

  return function(theModel) {
    var collection = db.collection(theModel.modelName);

    // extensions for operation & factory call
    collection.callOperation = function(opName, params, HTMLrequest) {
      var deferred = Q.defer();

      var res;
      if (theModel.operations.hasOwnProperty(opName)) {  // call is an operation
        res = theModel.operationImpls[opName](params, HTMLrequest);
      } else if (theModel.factorys.hasOwnProperty(opName)) {  // call is a factory
        res = theModel.factoryImpls[opName](params, HTMLrequest);
      } else {
        assert(false, "Call '"+opName+"' was not defined");
      }

      if (res != undefined && res.name == 'promise') return res;  // if the function already returns a promise
      deferred.resolve(res);
      return deferred.promise;
    };

    // findOne overwrite - workaround for Bug #10
    collection.findOne = function(search, callback) {
      collection.find(search, function(err, docs) {
        if (err) {
          callback(err, docs);
          return;
        }
        if (docs.lengh < 1) {
          callback(err, null);
          return;
        }
        callback(err, docs[0]);
      });
    };

    return collection;  // the collection for this model
  }
};


// Using the REST-Interface
Model.AngularConnector = function(connectionUrl) {
  assert(angular !== undefined, "AngularJS has to be loaded!");

  var $http = angular.injector(['ng']).get('$http');

  var findUnpackInterceptor = function(model, callback) {
    return function(err, docs) {
      if (err == undefined) {
        for (var i=0; i<docs.length; i++) {
          model._transform(model, docs[i], 'unpack');
        }
      }
      callback(err, docs);
    }
  }

  var findOneUnpackInterceptor = function(model, callback) {
    return function(err, doc) {
      if (err == undefined) {
        model._transform(model, doc, 'unpack');
      }
      callback(err, doc);
    }
  }


  // ajax Call to the server backend
  var ajaxCall = function(method, url, data, callback) {

    $http({method:method, url:url, data:data, withCredentials: true, cache: false})
      .success(function(data, status, headers, config) {
        if (status == 200) {
          if (!status.hasOwnProperty("error")) {
            callback(undefined, data);
          } else {
            callback(status.error, null);
          }
        } else {
          callback(new Error("HTTP Response != 200"), null);
        }
      })
      .error(function(data, status, headers, config) {
        if (data.hasOwnProperty("error")) {
          callback(new Error(data.error), null);
        } else {
          callback(new Error("Error in $http-request"), null);
        }
      });
  };


  return function(theModel) {
    return {
      find : function(search, callback) {
        if (isEmptyObject(search)) {
          ajaxCall('GET', connectionUrl + theModel.modelName + '/all', undefined, findUnpackInterceptor(theModel, callback));
        } else {
          ajaxCall('POST', connectionUrl + theModel.modelName + '/find', search, findUnpackInterceptor(theModel, callback));
        }
      },
      findOne : function(search, callback) {
        assert(search.hasOwnProperty("_id"), "Only searching for id implemented so far");
        ajaxCall('GET', connectionUrl + theModel.modelName + '/' + search._id, undefined, findOneUnpackInterceptor(theModel, callback));
      },
      save : function(doc, callback) {
        theModel._transform(theModel, doc, 'pack');
        ajaxCall('PUT', connectionUrl + theModel.modelName + '/', doc, callback);
      },
      remove : function(id, ignored, callback) {
        ajaxCall('DELETE', connectionUrl + theModel.modelName + '/' + id._id, undefined, callback);
      },
      callOperation : function(opName, params, HTMLrequest) {
        var deferred = Q.defer();
        ajaxCall('PUT', connectionUrl + theModel.modelName + '/' + opName, params, function(err, result) {

          if (theModel.operations.hasOwnProperty(opName)) {  // call is an operation

            if (err) deferred.reject(err);
            else deferred.resolve(result);

          } else if (theModel.factorys.hasOwnProperty(opName)) {  // call is an factory

            if (err) {
              deferred.reject(err);
              return deferred.promise;
            }

            // restore object from document
            if (Array.isArray(result)) {  // result is a collection
              // für jedes document in der DB ein object anlegen
              for (var i=0; i<result.length; i++) {
                result[i] = theModel.loadFromDoc(result[i]);
              }
            } else {  // result is one object
              result = theModel.loadFromDoc(result);  // restore one object
            }

            deferred.resolve(result);

          } else {
            assert(false, "operation or factory is not defined");
          }
        });

        return deferred.promise;
      }
    }
  }
};

///////////////////////////
// Methods

Model.prototype.attr = function(attrName) {
  var filters = [];
  for (var i in arguments) {
    if (i != '0')  // except for attrName
      filters.push(arguments[i]);
  }
  this.attrs[attrName] = {name : attrName, filters : filters};

  return this;
};


Model.prototype.attrRef = function(attrName, reference) {
  this.attrRefs[attrName] = reference;

  return this;
};


Model.prototype.attrObj = function(attrName, obj) {
  this.attrObjs[attrName] = obj;

  return this;
};


Model.prototype.method = function(methodName) {
  this.methods[methodName] = methodName;

  return this;
};


Model.prototype.methodImpl = function(methodName, fnImpl) {
  this.methodImpls[methodName] = fnImpl;

  return this;
};


Model.prototype.virtualAttr = function(attrName, attrType) {
  this.virtualAttrs[attrName] = {name : attrName, type : attrType};

  return this;
};


Model.prototype.virtualAttrImpl = function(virtualAttrName, fnImpl) {
  this.virtualAttrImpls[virtualAttrName] = fnImpl;

  return this;
};


Model.prototype.attrArray = function(attrName, obj) {
  this.attrArrays[attrName] = obj;

  return this;
};


Model.prototype.attrRefArray = function(attrName, obj) {
  this.attrRefArrays[attrName] = obj;

  return this;
};


Model.prototype.operation = function(operationName) {
  this.operations[operationName] = operationName;
  this[operationName] = function(params) {
    assert(this.collection != undefined, "Use a connectior!");
    return this.callOp(operationName, params, null);
  };

  return this;
};


Model.prototype.operationImpl = function(operationName, fnImpl) {
  this.operationImpls[operationName] = fnImpl;

  return this;
};


Model.prototype.factory = function(factoryName) {
  this.factorys[factoryName] = factoryName;
  this[factoryName] = function(params) {
    return this.callOp(factoryName, params, null);
  };

  return this;
};


Model.prototype.factoryImpl = function(factoryName, fnImpl) {
  this.factoryImpls[factoryName] = fnImpl;

  return this;
};


// setup connection stuff
Model.prototype.connection = function(connector) {
  assert(connector !== undefined, "Don't set a undefined connection!");
  this.connector = connector;
  this.collection = connector(this);
};


// setup webserver stuff
Model.prototype.express = function(app) {
  this.app = app;
};


// der express teil :-)
Model.prototype.serve = function() {
  var self = this;

  // filter to allow cross origin requests
  this.app.all('*', function(req, res, next) {
    res.header('Access-Control-Allow-Credentials', true);
    //res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Methods', 'OPTIONS,GET,POST,PUT,DELETE');
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    if ('OPTIONS' == req.method) { return res.send(200); }
    next();
  });


  // REST - GET all
  this.app.get('/' + this.modelName + '/all', function(req, res){

    res.setHeader('Content-Type', 'application/json');
    self.filtered_all(req)
      .then(function(docs) {
        // pack data for transport
        for (var i=0; i<docs.length; i++) {
          self._transform(self, docs[i], "pack");
        }
        res.send(JSON.stringify(docs, null, 2));
      })
      .fail(function (err) {
        if (!err.statusCode) console.log("Error in HTTP GET - all()\n", err.message, "\nStack:\n", err.stack);
        res.send(err.statusCode || 500, {error: err.message} );
      }).done();
  });

  /*
   * Security Issue
   * transform ObjectID!!
   */

  // REST - GET find
  this.app.post('/' + this.modelName + '/find', function(req, res){
    res.setHeader('Content-Type', 'application/json');
    self.filtered_find(req.body, req)
      .then(function(docs) {
        // pack data for transport
        for (var i=0; i<docs.length; i++) {
          self._transform(self, docs[i], "pack");
        }
        res.send(JSON.stringify(docs, null, 2));
      })
      .fail(function (err) {
        if (!err.statusCode) console.log("Error in HTTP GET - find()\n", err.message, "\nStack:\n", err.stack);
        res.send(err.statusCode || 500, {error: err.message} );
      }).done();
  });


  // REST - GET id
  this.app.get('/' + this.modelName + '/:id', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    self.filtered_get(req.params.id, req)
      .then(function(doc) {
        // pack data for transport
        self._transform(self, doc, "pack");
        res.send(JSON.stringify(doc, null, 2));
      })
      .fail(function (err) {
        if (!err.statusCode) console.log("Error in HTTP GET - get()\n", err.message, "\nStack:\n", err.stack);
        res.send(err.statusCode || 500, {error: err.message} );
      }).done();
  });

  // REST - save doc
  this.app.put('/' + this.modelName, function(req, res) {
    assert(req.body != undefined, "request body missing! Use bodyParser!");

    res.setHeader('Content-Type', 'application/json');

    // client sendet obj._id als string ->  in ObjectId umwandeln
    if (req.body._id != undefined) {
      var ObjectId = require('mongojs').ObjectId;
      try {
        req.body._id = ObjectId(req.body._id);
      } catch (e) {
        res.send(err.statusCode || 400, {error: "Invalid ObjectId Format"} );
        return;
      }
    }

    // unpack data for storage
    self._transform(self, req.body, "unpack");

    self.filtered_save(req.body, req)
      .then(function(doc) {
        res.send(JSON.stringify(doc, null, 2));
      })
      .fail(function (err) {
        if (!err.statusCode) console.log("Error in HTTP GET - save()\n", err.message, "\nStack:\n", err.stack);
        res.send(err.statusCode || 500, {error: err.message} );
      }).done();
  });

  // REST - remove doc
  this.app.del('/' + this.modelName + '/:id', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    self.filtered_remove(req.params.id, req)
      .then(function() {
        res.send(200);
      })
      .fail(function (err) {
        if (!err.statusCode) console.log("Error in HTTP GET - remove()\n", err.message, "\nStack:\n", err.stack);
        res.send(err.statusCode || 500, {error: err.message} );
      }).done();
  });


  // REST - PUT operation
  this.app.put('/' + this.modelName + '/:op', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    assert(req.body != undefined, "No body in request!")
    self.filtered_callOp(req.params.op, req.body, req)
      .then(function(result) {
        res.send(200, result);
      })
      .fail(function (err) {
        if (!err.statusCode) console.log("Error in HTTP GET - operation()\n", err.message, "\nStack:\n", err.stack);
        res.send(err.statusCode || 500, {error: err.message} );
      }).done();

  });

};


// simuliert das verhalten einer referenz auf ein anderes Object
// Zugriff dann mit object.ref().XXX
Model.prototype.reference = function(refModel, parentModel) {

  // das weiterreichn wollte macht irgendwie probleme (sollte eigentlich auch ohne funktionieren) TODO
  refModel.connection(parentModel.connector);  // mongodb connection an child modell durchreichen

  this.create = function() {
    var refObj = refModel.create();
    this.ref = function() { return refObj; }  // definition von der .ref()-Methode
    return this.ref();
  }

  // load object
  // todo: soll erst verfügbar sein, wenns auch was zum laden gibt
  this.load = function() {
    var loadScope = this;

    var deferred = Q.defer();
    if (this._reference === undefined) {
      deferred.reject(new Error("Reference not set! Don't now what to load!"));
      return deferred.promise;
    }

    return refModel.get(this._reference)
      .then(function(obj) {
        var refObj = obj;
        loadScope.ref = function() { return refObj; }  // definition von der .ref()-Methode

        return refObj;
      });
  };

  // set an existing object to the reference
  // TODO: type check -> geht garnicht so einfach (object müsste wissen zu welchem modell es gehört)
  this.setObject = function(obj) {
    var refObj = obj;

    if (obj._id === undefined) {
      throw new Error("Save object first, then set object reference!");
    }

    this.ref = function() { return refObj; }
    this._reference = obj._id;

  }
};


// Many-Referenzen (das laden aus der DB)
Model.prototype.arrayReference = function(refModel, parentModel) {
  refModel.connection(parentModel.connector);  // mongodb connection an child modell durchreichen

  this.load = function() {   //TODO: ist ja genau das selbe Load wie beim reference!!
    var loadScope = this;

    var deferred = Q.defer();
    if (this._reference === undefined) {
      deferred.reject(new Error("Reference not set! Don't now what to load!"));
      return deferred.promise;
    }

    return refModel.get(this._reference)
      .then(function(obj) {
        var refObj = obj;
        loadScope.ref = function() { return refObj; }  // definition von der .ref()-Methode
        return refObj;
      });
  };

};

// verhalten von Many-Referenzen (erstellen eines neuen objects)
Model.prototype.createArrayReferenceElement = function(refModel, obj, arrayName) {
  var self = this;

  // Das hier ist die Funktion die ein neue Array-Reference anlegt
  return function() {
    var refObj = refModel.create();

    // Das Reference Array Element zusammen bauen
    var el = new self.arrayReference(refModel, self);
    el.ref = function() { return refObj; };

    var array = obj[arrayName];
    array.push(el);

    return el.ref();
  }
}


Model.prototype.createArrayElement = function(arrayModel, obj, arrayName) {
  // Das hier ist die Funktion um ein neues Array Element anzulegen
  return function() {
    var el = arrayModel._initObject(); // creates the new element

    var array = obj[arrayName];
    array.push(el); // add the element to the array
    return el;
  }
}


/// Erstellt alles was für den Datenbankzugriff benötigt wird

// def was ich alles mit dem obj tun kann
Model.prototype._addStore = function(obj) {
  var self = this;

  var prepareSave = function(obj, model) {
    var doc = {};  // the target document to sore

    if (obj.hasOwnProperty("_id")) {
      doc._id = obj._id;  // copy _id
    }

    // copy attrObjs
    for (var i in model.attrObjs) {
      check(typeof obj[i] == 'object', "Object attribute '"+ i +"' not provided in your object (model '"+model.modelName+"')");
      doc[i] = prepareSave(obj[i], model.attrObjs[i]);
    }

    // copy attrArrays
    for (var i in model.attrArrays) {
      check(Array.isArray(obj[i]), "Array '"+ i +"' is not correctly provided in your object (model '"+model.modelName+"')");

      doc[i] = [];
      for (var j in obj[i]) {
        doc[i][j] = prepareSave(obj[i][j], model.attrArrays[i]);
      }
    }

    // apply attribute filters (eg. for type check..)
    for (var i in model.attrs) {
      check(obj.hasOwnProperty(model.attrs[i].name), "Attribute '"+ model.attrs[i].name +"' not provided in your object (model '"+model.modelName+"')");

      doc[model.attrs[i].name] = obj[model.attrs[i].name];  // copy attribute

      try {
        for (var j=0; j<model.attrs[i].filters.length; j++) {
          doc[model.attrs[i].name] = model.attrs[i].filters[j](doc[model.attrs[i].name], 'save');  // call filter
        }
      } catch (err) {
        err.message = "Can't save '"+model.attrs[i].name+"' " + err.message;
        throw err;
      };

      obj[model.attrs[i].name] = doc[model.attrs[i].name];  // copy back to obj
    }

    // Speichern (vorbereiten) von Referenz-Attributen
    for (var i in model.attrRefs) {
      check(obj[i] instanceof Object, i + " not correctly provided");

      //doc[i] = obj[i];  // copy ref-attr
      doc[i] = {};

      if (obj[i].ref !== undefined && obj[i].ref()._id !== undefined) {  // wenn das referenzierte Object existiert und bereits gespeichert wurde
        obj[i]._reference = obj[i].ref()._id;  // die reference id an das object geben
        doc[i]._reference = obj[i].ref()._id;  // die reference id mit persisieren
      }

      //obj[i] = doc[i];  // copy back to obj
    }

    // Speichern (vorbereiten) von Referenz-Arrays
    for (var i in model.attrRefArrays) {  // über alle Referenz Arrays die in meinem Modell vorkommen
      check(obj[i] instanceof Object, i + " not correctly provided");

      doc[i] = [];  // copy only the references


      var refArray = obj[i];
      for (var j=0; j<refArray.length; j++) {  // über die einzelnen Elemente dieses Arrays
        var ref = refArray[j];
        if (ref !== undefined && ref.ref !== undefined && ref.ref()._id !== undefined) {  // wenn das referenzierte Object existiert und bereits gespeichert wurde
          obj[i][j]._reference = ref.ref()._id;   // die reference id im object speichern
          doc[i][j] = {};
          doc[i][j]._reference = ref.ref()._id;   // die reference id mit persisieren
        }
      }
    }

    return doc;
  }

  // The Save-function for a object instance
  obj.save = function() {
    var deferred = Q.defer();

    try {
      var doc = prepareSave(obj, self);
    } catch (e) {
      deferred.reject(e);
      return deferred.promise;
    }

    // transform the object to a document
    // and apply attribute filters
    return self.save(doc)  // store the document
      .then(function(resDoc) {
        // Achtung: client gibt hier ein string zurück
        if (resDoc != 1) {  // doc is 1 if an insert was performed
          obj._id = resDoc._id;  // store the generated Mongo-ObjectId to the local context
        }

        return obj;
      });
  }

  obj.remove = function() {
    var deferred = Q.defer();

    if (obj._id === undefined) {
      deferred.reject(new Error("Object seems not to been saved so far!"));
      return deferred.promise;
    }

    return self.remove(obj._id)
      .then(function() {
        delete obj._id;

        deferred.resolve();
        return deferred.promise;
      })
      .fail(function(err) {
        deferred.reject(err);
        return deferred.promise;
      });

  };

  obj.validate = function(attr) {
    try {
      for (var i=0; i<self.attrs[attr].filters.length; i++) {
        self.attrs[attr].filters[i](obj[attr], 'validate');  // call filter
      }
    } catch (err) {
      return err.message;
    };

    return true;
  };

  return obj;
};


// Erstellt ein neues Object aus dem Modell
Model.prototype.create = function(initValues) {
  var obj = this._initObject();
  obj = this._addStore(obj);

  if (initValues) {
    for (var i in initValues) {
      obj[i] = initValues[i];
    }
  }

  return obj;
};


// Create an empty collection of Modelizer Objects
// and add some nice functions
Model.prototype.createCollection = function() {
  var self = this;

  var coll = [];

  coll.create = function() {
    var el = self.create();
    coll.push(el);
  };

  coll.save = function() {
    for (var i=0; i<coll.length; i++) {
      coll[i].save().done();
    }
  }

  return coll;
}


// Diese Funktion fügt alles aus dem Modell in ein neues Object hinzu
Model.prototype._initObject = function() {
  var obj = new Object();  // das wird usere Modell-Instanz

  // create the attributes
  for(var i in this.attrs) {
    obj[this.attrs[i].name] = null;
  }

  // create Attribute Objects (a sub structure)
  for(var i in this.attrObjs) {
    var attrObj = this.attrObjs[i]._initObject();
    obj[i] = attrObj;
  }

  // create a reference to another model
  for(var i in this.attrRefs) {
    var modelRef = this.attrRefs[i];
    obj[i] = new this.reference(modelRef, this);

  }

  // create a reference Array to another model
  for(var i in this.attrRefArrays) {
    var modelRef = this.attrRefArrays[i];  // Das Model auf das referenziert wird
    var arrayName = i;

    obj[i] = [];  // init with empty array

    arrayName = arrayName[0].toUpperCase() + arrayName.substr(1);
    obj["create" + arrayName] = this.createArrayReferenceElement(modelRef, obj, i);
  }

  // create the methods
  for(var i in this.methods) {
    //  obj[i] = function() {
    //    return this.callMethod(i, arguments);
    //  }
    obj[i] = this.methodImpls[i];
  }

//    // create the virtualAttrs
//    for (var i in this.virtualAttrs) {
//      obj[i] = this.virtualAttrImpls[i](obj);
//    }
  // TODO: es ist unklar wann am besten der Wert für ein virtueles Attribut brechnet wird

  // create stuff for attrArrays
  for (var i in this.attrArrays) {
    obj[i] = [];

    var arrayName = i;
    arrayName = arrayName[0].toUpperCase() + arrayName.substr(1);
    obj["create" + arrayName] = this.createArrayElement(this.attrArrays[i], obj, i);
  }

  return obj;
};


Model.prototype.readFilter = function(fn) {
  this.readFilters.push(fn);
};


// create the filter hash (mongo search string)
Model.prototype._getReadFilter = function(req) {
  var res = {};
  for (var i=0; i<this.readFilters.length; i++) {  // alle filter
    var filter = this.readFilters[i](req);
    if (filter === false) return false;  // deny all filter
    if (filter === true) continue;  // ignore filter

    // copy content
    for (var j in filter) {
      res[j] = filter[j];
    }
  }
  return res;
}


Model.prototype.writeFilter = function(fn) {
  this.writeFilters.push(fn);
}


// create the filter hash (mongo search string)
Model.prototype._getWriteFilter = function(obj, req) {
  var res = {};
  for (var i=0; i<this.writeFilters.length; i++) {  // alle filter
    var filter = this.writeFilters[i](obj, req);
    if (filter === false) return false;  // deny all filter
    if (filter === true) continue;  // ignore filter

    // copy content
    for (var j in filter) {
      res[j] = filter[j];
    }
  }
  return res;
}

// Using the model (static functions)

Model.prototype.loadFromDoc = function(doc, initObj) {
  var obj = initObj || this.create();
  // TODO: das hier überschreibt ja alle Methoden
  // da muss ich mir was besseres überlegen

  for (var j in doc) {
    obj[j] = doc[j];
  }

  // TODO: hier kopierere ich teilweise _initObject verhalten (-> kapseln )

  // hier kümmere ich mich um die Referenzen
  for(var j in this.attrRefs) {
    var modelRef = this.attrRefs[j];
    var ref_id = obj[j]._reference;
    obj[j] = new this.reference(modelRef, this);
    obj[j]._reference = ref_id;
  }

  // hier kümmere ich mich um Referenz-Arrays
  for(var j in this.attrRefArrays) {
    var modelRef = this.attrRefArrays[j];
    var refArray = obj[j];

    assert(typeof refArray.length === 'number');
    for (var k=0; k<refArray.length; k++) {
      var ref = refArray[k];
      var ref_id = ref._reference;   // _reference retten
      obj[j][k] = new this.arrayReference(modelRef, this);
      obj[j][k]._reference = ref_id;       // zurück speichern
    }
  }

  // TODO: kopieren von anderen Methoden die durch das kopieren oben überschrieben werden


  return obj;
};



// use default get
Model.prototype.filtered_get = function(id_str, req) {
  var ObjectId = require('mongojs').ObjectId;
  var id;

  try {
    id = ObjectId(id_str);
  } catch (e) {
    var deferred = Q.defer();
    deferred.reject(new Error("Invalid ObjectId Format"));
    return deferred.promise;
  }

  return this.filtered_find({_id:id}, req)
    .then(function (docs) {
      if (docs.length != 1) {
        var deferred = Q.defer();
        deferred.reject(new Error("Object not found!"));
        return deferred.promise;
      }

      return docs[0];
    });
};

Model.prototype.filtered_find = function(search, req) {
  var filter = this._getReadFilter(req);

  if (filter === false) {  // deny all
    var deferred = Q.defer();
    var deniedError = new Error("Access denied!");
    deniedError.statusCode = 401;
    deferred.reject(deniedError);
    return deferred.promise;
  }

  // copy
  for (var i in filter) {  // erweitere die Suche um den filter
    search[i] = filter[i];
    // Achtung: security! Suche muss mit Filterkriterien überschrieben werden!!
  }

  // weiterrichen an die eigentliche Suche
  //console.log(search);
  return this.find(search);
};

Model.prototype.filtered_all = function(req) {
  return this.filtered_find({}, req);
};

Model.prototype.filtered_save = function(obj, req) {
  // TODO: ich übergebe da eigentlich ein doc kein obj!!

  var filter = this._getWriteFilter(obj, req);

  if (filter === false) {  // deny all
    var deferred = Q.defer();
    var deniedError = new Error("Access denied!");
    deniedError.statusCode = 401;
    deferred.reject(deniedError);
    return deferred.promise;
  }

  // TODO: der Filter muss irgendwie angewand werden -> da braucht es noch ein Konzept
//      // copy
//      for (var i in filter) {  // erweitere die Suche um den filter
//        search[i] = filter[i];
//        // Achtung: security! Suche muss mit Filterkriterien überschrieben werden!!
//      }


  // weiterrichen an den Aufruf
  return this.save(obj);

};

Model.prototype.filtered_remove = function(id_str, req) {
  var self = this;
  var deferred = Q.defer();

  var ObjectId = require('mongojs').ObjectId;
  var id;
  try {
    id = ObjectId(id_str);
  } catch (e) {
    deferred.reject(new Error("Invalid ObjectId Format"));
    return deferred.promise;
  }

  return self.get(id)
    .then(function(obj){
      var filter = self._getWriteFilter(obj, req);

      if (filter === false) {  // deny all
        var deniedError = new Error("Access denied!");
        deniedError.statusCode = 401;
        deferred.reject(deniedError);
        return deferred.promise;
      }

      // weiterrichen an den Aufruf
      return self.remove(id);
    })
};

Model.prototype.filtered_callOp = function(operationName, params, HTMLrequest) {
  // todo security
  // todo: assure that operationName is in this.operations (security)
  return this.callOp(operationName, params, HTMLrequest);
};


// using of the model with mongo db
Model.prototype.findById = function(id, initObj) {
  return this.get(id, initObj);
}

Model.prototype.get = function(id, initObj) {
  var self = this;
  var deferred = Q.defer();

  self.collection.findOne({_id:id}, function(err, doc) {
    if (err) {
      deferred.reject(err);
      return;
    }
    if (doc === null) {
      deferred.reject(new Error("Object not found!"));
      return;
    }

    var obj = self.loadFromDoc(doc, initObj);
    deferred.resolve(obj);
  });

  return deferred.promise;
};

Model.prototype.findOne = function(search, initObj) {
  var self = this;
  var deferred = Q.defer();

  self.collection.findOne(search, function(err, doc) {
    if (err) {
      deferred.reject(err);
      return;
    }
    if (doc === null) {
      deferred.reject(new Error("Object not found!"));
      return;
    }

    var obj = self.loadFromDoc(doc, initObj);
    deferred.resolve(obj);
  });

  return deferred.promise;
};

Model.prototype.find = function(search, initObj) {
  var self = this;
  var deferred = Q.defer();

  self.collection.find(search, function(err, docs) {
    if (err) return deferred.reject(err);
    var objs = initObj || self.createCollection();

    // für jedes document in der DB ein object anlegen
    for (var i=0; i<docs.length; i++) {
      var doc = docs[i];
      var obj = self.loadFromDoc(doc);

      objs.push(obj);
    }

    deferred.resolve(objs);
  });

  return deferred.promise;
};

Model.prototype.all = function(initObj) {
  return this.find({}, initObj);
};

Model.prototype.save = function(obj) {
  var deferred = Q.defer();
  assert(this.collection != undefined, "connection no set for " + this.modelName);

  this.collection.save(obj, function(err, doc) {
    if (err) {
      deferred.reject(err);
      return;
    }
    deferred.resolve(doc);
  });

  return deferred.promise;
};

Model.prototype.remove = function(id) {
  var deferred = Q.defer();
  this.collection.remove({_id:id}, true, function(err, result) {
    if (result == "OK") {  // success from a client call
      deferred.resolve();
      return;
    }

    if (err) {
      deferred.reject(new Error('Failed to remove document!'));
      return;
    }

    // Hinweis: MongoDB unter windows liefert ein anderes 'result'.. unklar warum
    if (result === 1 || (result.hasOwnProperty('n') && result.n == 1)) {  // removed sucessfull
      deferred.resolve();
      return;
    }
    if (result === 0 || ( result.hasOwnProperty('n') && result.n.hasOwnProperty('n') && result.n.n == 0 ) ) {
      deferred.reject(new Error('No document with this id found!'));
      return;
    }

    deferred.reject(new Error("Don't know what was the result of removing the object"));
    return;
  });

  return deferred.promise;
};

Model.prototype.callOp = function(operationName, params, HTMLrequest) {
  return this.collection.callOperation(operationName, params, HTMLrequest);
};

// serialize doc
Model.prototype._transform = function(model, doc, method) {

  // handle attributes
  for (var i in model.attrs) {
    for (var j=0; j<model.attrs[i].filters.length; j++) {
      doc[model.attrs[i].name] = model.attrs[i].filters[j](doc[model.attrs[i].name], method);  // call pack/unpack filter
    }
  }

  // pack attrObjs
  for (var i in model.attrObjs) {
    this._transform(model.attrObjs[i], doc[i], method);
  }

  // copy attrArrays
  for (var i in model.attrArrays) {
    for (var j in doc[i]) {
      this._transform(model.attrArrays[i], doc[i][j], method);
    }
  }
}

Model.prototype.processSchema = function(schema) {
  assert(typeof schema == 'object', "Error in Schema ("+this.modelName+") definition (has to be a Hash)");

  for (var entry in schema) {
    var value = schema[entry];
    //console.log("value", value);

    // it is a attrArray
    if (Array.isArray(value)) {
      assert(value.length == 1, "Only one element in " + entry + " allowed");
      var attrArrayModel = new Model(entry, value[0]);
      this.attrArray(entry, attrArrayModel);

    } else if (value instanceof Model) {
      this.attrObj(entry, value);

      // it is a attribute
    } else if (value._what == 'attr') {
      this.attr(entry, value.filter);

      // it is a reference to another model
    } else if (value._what == 'attrRef') {
      this.attrRef(entry, value.ref);

      // it is a many Reference to another model
    } else if (value._what == 'attrRefArray') {
      this.attrRefArray(entry, value.ref);

      // it is a operation definition
      // todo parameter validation
    } else if (value._what == 'operation') {
      this.operation(entry);

    } else if (value._what == 'factory') {
      this.factory(entry);

      // i assume in this cases that it is an 'attrObj' (nested object)
    } else {
      var attrObjModel = new Model(entry, value);
      this.attrObj(entry, attrObjModel);
    }
  }
};






///////////////////////////
// Helpers for Schema definition

// Usage eg: Attr(Types.String, Attr.default("foo"), ..)
Model.Attr = function() {
  var filters = arguments;
  
  return {
    '_what' : 'attr',
    filter: function(value, action) {
      for (var i in filters) {
        value = filters[i](value, action);  // call all filters
      }
      return value;
    }
  };
};

Model.Ref = function(reference) {
  return {
    '_what' : 'attrRef',
    ref : reference
  };
}

Model.RefArray = function(reference) {
  return {
    '_what' : 'attrRefArray',
    ref : reference
  }
}

Model.Operation = function() {
  return {
    '_what' : 'operation'
  }
}

Model.Factory = function() {
  return {
    '_what' : 'factory'
  }
}

///////////////////////////


///////////////////////////
// Filters and Type  checks

// define a default value for a attribute
Model.Attr.default = function(def) {
  return function(value, action) {
    if (value == undefined || value == null) {
      value = def;
    }
    return value;
  }
};

Model.Attr.Types = {
  // define a string type
  string : function(value, action) {
    if (typeof value != 'string' && value !== undefined && value !== null) {
      throw new Error("'"+value+"' is not a string value");
    }
    return value;
  },
  // define a number type
  number : function(value, action) {
    if (typeof value != 'number' && value !== undefined && value !== null) {
      throw new Error("'"+value+"' is not a number");
    }
    return value;
  },
  boolean : function(value, action) {
    if (typeof value != 'boolean' && value !== undefined && value !== null) {
      throw new Error("'"+value+"' is not a boolean");
    }
    return value;
  },
  date : function(value, action) {
    if (action == 'pack') {
      if (value !== undefined && value !== null && value instanceof Date) {
        return value.toISOString();
      } else {
        return value;
      }
    }

    if (action == 'unpack') {
      if (value !== undefined && value !== null) {
        return new Date(value);
      } else {
        return value;
      }
    }

    if (!(value instanceof Date) && value !== undefined && value !== null) {
      throw new Error("'"+value+"' is not a date");
    }

    return value;
  },
  array : function(value, action) {
    if (!Array.isArray(value) && value !== undefined && value !== null) {
      throw new Error("'"+value+"' is not an array");
    }
    return value;
  },
  ObjectId : function(value, action) {
    return value;
  },
  // define a enumeration type
  enum : function() {

    var enums = {};
    for (var i in arguments) {
      enums[arguments[i]] = true;
    }

    return function(value, action) {
      if (!enums[value] && value !== undefined && value !== null) {
        throw new Error("'"+value+"' is not in the enum");
      }
      return value;
    }
  }
};



///////////////////////////


Model.runSampleServer = function(dir, port, mongostr) {

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

  Model.sampleServer = {};
  Model.sampleServer.app = app;
  Model.sampleServer.connector = Model.MongoConnector(db);

  console.log("Server setup at Port", port);
  //console.log("Server dir", __dirname)
}

// all implementieren
// eigentlich ist model-def ein aspekt
// und von den aspekten gibts viele

if (typeof window === 'undefined') {
  module.exports = Model;

} else {
  window.require = function(content) {
    if (content.indexOf('modelizer') != -1) return Model;
  }
}
