require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"pZmObk":[function(require,module,exports){
/**
  *  The Client implementation of Modelizer
  *
  *  run:
  *  browserify ./lib/angular-client.js -r ./lib/angular-client:modelizer -r q -o ./browser-dist/modelizer-angular.js
  */

var Q = require('q');

var assert = require('./microlibs').assert;
var check = require('./microlibs').check;
var isEmptyObject = require('./microlibs').isEmptyObject;


var Model = require('./model');


// Using the REST-Interface
Model.AngularConnector = function (connectionUrl) {
  assert(angular !== undefined, "AngularJS has to be loaded!");

  var $http = angular.injector(['ng']).get('$http');

  var unpackInterceptor = function (model, callback) {
    return function (err, docs) {

      if (err == undefined) {
        if (Array.isArray(docs)) {  // result is a collection
          for (var i = 0; i < docs.length; i++) {
            model._transform(model, docs[i], 'unpack');
          }
        } else {
          model._transform(model, docs, 'unpack');
        }
      }

      callback(err, docs);
    }
  };


  // ajax Call to the server backend
  var ajaxCall = function (method, url, data, callback) {

    $http({method: method, url: url, data: data, withCredentials: true, cache: false})
      .success(function (data, status, headers, config) {
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
      .error(function (data, status, headers, config) {
        if (data.hasOwnProperty("error")) {
          callback(new Error(data.error), null);
        } else {
          callback(new Error("Error in $http-request"), null);
        }
      });
  };


  return function (theModel) {
    return {
      find: function (search, callback) {
        if (isEmptyObject(search)) {
          ajaxCall('GET', connectionUrl + theModel.modelName + '/all', undefined, unpackInterceptor(theModel, callback));
        } else {
          ajaxCall('POST', connectionUrl + theModel.modelName + '/find', search, unpackInterceptor(theModel, callback));
        }
      },
      findOne: function (search, callback) {
        assert(search.hasOwnProperty("_id"), "Only searching for id implemented so far");
        ajaxCall('GET', connectionUrl + theModel.modelName + '/' + search._id, undefined, unpackInterceptor(theModel, callback));
      },
      save: function (doc, callback) {
        theModel._transform(theModel, doc, 'pack');
        ajaxCall('PUT', connectionUrl + theModel.modelName + '/', doc, callback);
      },
      remove: function (id, ignored, callback) {
        ajaxCall('DELETE', connectionUrl + theModel.modelName + '/' + id._id, undefined, callback);
      },
      callOperation: function (opName, params, HTMLrequest) {
        var deferred = Q.defer();
        ajaxCall('PUT', connectionUrl + theModel.modelName + '/' + opName, params, function (err, result) {

          if (theModel.operations.hasOwnProperty(opName)) {  // call is an operation

            if (err) deferred.reject(err);
            else deferred.resolve(result);

          } else if (theModel.factorys.hasOwnProperty(opName)) {  // call is an factory

            unpackInterceptor(theModel, function(err, result) {

              if (err) {
                deferred.reject(err);
                return deferred.promise;
              }

              // restore object from document
              if (Array.isArray(result)) {  // result is a collection
                // für jedes document in der DB ein object anlegen
                for (var i = 0; i < result.length; i++) {
                  result[i] = theModel.loadFromDoc(result[i]);
                }
              } else {  // result is one object
                result = theModel.loadFromDoc(result);  // restore one object
              }

              deferred.resolve(result);

            })(err, result);

          } else {
            assert(false, "operation or factory is not defined");
          }
        });

        return deferred.promise;
      }
    }
  }
};


//////////////////////////////////////
// extra angular.js features

Model.prototype.angular = function(scope) {
  this.scope = scope;
};


Model.prototype.$get = function(id) {
  var scope = this.scope;

  var obj = this.create();  // create the object
  this.getQ(id, obj).then(function(o) {
    //obj = o;  // optional
    scope.$apply();
  }).done();
  return obj;
};



Model.prototype.$find = function(query) {
  var scope = this.scope;

  var objs = this.createCollection();  // create the object
  this.findQ(query, objs).then(function(os){
    scope.$apply();
  }).done();
  return objs;
};


Model.prototype.$all = function() {
  var scope = this.scope;

  var objs = this.createCollection();   // create the object
  this.allQ(objs).then(function(os){
    scope.$apply();
  }).done();
  return objs;
};

/*
 var org_create = Model.prototype.create;
 Model.prototype.create = function(initValues) {
 var scope = this.scope;
 var obj = org_create.call(this, initValues);

 obj.$save = function() {
 obj.save.then(function() {
 scope.$apply();
 }).done();
 };

 obj.$remove = function() {
 obj.remove.then(function() {
 scope.$apply();
 }).done();
 };

 return obj;
 }
 */


// CommonJS
module.exports = Model;

},{"./microlibs":3,"./model":4,"q":"qLuPo1"}],"modelizer":[function(require,module,exports){
module.exports=require('pZmObk');
},{}],3:[function(require,module,exports){
////// Micro libs ////


module.exports = {
  assert : function (condition, message) {
    if (!condition) {
      console.log('Assertion failed', message);
      console.trace();
      throw new Error(message || "Assertion failed");
    }
  },


  check : function(condition, message) {
    if (!condition) {
      throw new Error(message || "Check failed");
    }
  },

  // http://stackoverflow.com/questions/679915/how-do-i-test-for-an-empty-javascript-object-from-json
  isEmptyObject : function(obj) {
    var name;
    for (name in obj) {
      return false;
    }
    return true;
  }
};


},{}],4:[function(require,module,exports){
/**
  *   Modelizer - by Jonathan Haeberle
  *   https://github.com/dreampulse/modelizer
  *
  *   This it the code, which is being shared between server and client
  *
  */

var assert = require('./microlibs').assert;
var check = require('./microlibs').check;
var isEmptyObject = require('./microlibs').isEmptyObject;

var Q = require('q');
//var _ = require('lodash');

// note: browserify will replace this ObjectId implementation by 'require("objectid-browser")' for the client
var ObjectId = require('./objectid');


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

  this.attrLinks = {};  // TODO

  this.operations = {};

  this.operationImpls = {};

  this.factorys = {};

  this.factoryImpls = {};

  // setup filters for using the model
  this.readFilters = [];

  this.afterReadFilters = function() { };  // only one


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
  if (Model.simpleServer) {
    console.log("init simple server for", this.modelName);

    // say that our model should use express and the database connector
    this.connection(Model.simpleServer.connector);
    this.express(Model.simpleServer.app);
    this.serve();
  }

  return this;
};




///////
// Der Store


/// Problem: ich will eigentlich Mengen abonieren
// das geht aber nicht so einfach
// couchdb anschauen...

// alle objekte werden hier gecached
// TODO: an remove denken -> geht nicht in js
Model.prototype.store = (function(){
  var store = {};  // private store

  var watchers = {};

  // sets of objects
  var all = [];
  var find = {};  // set of array with this results
  // änderungen können dann per websocket immer rein kommen
  // ist eigentlich ein abo an mengen...


  var updateSets = function() {
    // clean array
    // http://stackoverflow.com/questions/1232040/how-to-empty-an-array-in-javascript
    all.length = 0;

    for (var i in store) {
      all.push(store[i]);
    }
  }

  // todo use getters & setters
  return {
    set : function(obj) {
      assert(typeof obj === 'object', 'obj has to be an object');
      assert(obj.hasOwnProperty("_id"), 'obj has no id');

      // assume ObjectID right now!
      var id = obj._id.toString();
      if (store.hasOwnProperty(id)) {  // this object already exists

        for (var i in obj) {  // copy values
          store[id][i] = obj[i];
        }

        updateSets();  // TODO: performace only do that if object changed (later)

        if (watchers.hasOwnProperty(id)) {  // call watcher
          watchers[id](obj);
        }

      } else {
        assert(false, "actually no problem, but get() should be called before set() - in this case ;-)");
        store[id] = new Object();
      }
    },
    get : function(id) {  // implements a get or create

      //assert(typeof id === 'string', 'id has to be a string');
      id = id.toString();

      if (store.hasOwnProperty(id)) {  // there is that object
        return store[id];
      } else {  // create a new object
        store[id] = new Object();
        return store[id];
      }
    },
    del : function(id) {
      //assert(typeof id === 'string', 'id has to be a string');
      id = id.toString();

      if (store.hasOwnProperty(id)) {  // there is that object
        delete store[id];
      }

      updateSets();

      if (watchers.hasOwnProperty(id)) {  // call watcher
        watchers[id](undefined);
      }
    },
    all : function() {

      return all;
    },
    addWatcher : function(id, callback) {
      //assert(typeof id === 'string', 'id has to be a string');
      id = id.toString();

      watchers[id] = callback;  // todo können auch mehere sein
    },
    removeWatcher : function(id) {
      //assert(typeof id === 'string', 'id has to be a string');
      id = id.toString();

      delete watchers[id];  // todo können auch mehere sein
    }
  }
})();


// "Subclasses"


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

Model.prototype.attrLink = function(linkName, model, link) {
  this.attrLinks[linkName] = {
    model : model,
    link : link
  };

  return this;
};


Model.prototype.attrRefArray = function(attrName, obj) {
  this.attrRefArrays[attrName] = obj;

  return this;
};


Model.prototype.operation = function(operationName) {
  this.operations[operationName] = operationName;
  this[operationName] = function(params) {
    assert(this.collection != undefined, "Use a connector!");
    return this.callOpQ(operationName, params, null);
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
    return this.callOpQ(factoryName, params, null);
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

Model.prototype.link = function(model, linkModel) {
  var object;
  var subObject;

  this.set = function(obj, link) {
    //assert(obj instanceof model, "The object is not a instance of the right model");
    //assert(link instanceof linkModel, "You linked to a model with the wrong type");
    assert(link._id, "the target object has no _id");

    object = obj;
    subObject = link;
    this._link = link._id;
  };

  this.init = function(obj) {
    object = obj;
  };

  this.ref = function() {
    if (object && this._link) {
      var res = object._childObjs[this._link];
      assert(res, "link missing in lookup-table");
      return res;
    } else {
      throw new Error("Link not initialized");
    }
  }
};

// simuliert das verhalten einer referenz auf ein anderes Object
// Zugriff dann mit object.ref().XXX
Model.prototype.reference = function(refModel, parentModel) {

  // das weiterreichn wollte macht irgendwie probleme (sollte eigentlich auch ohne funktionieren) TODO
  //refModel.connection(parentModel.connector);  // mongodb connection an child modell durchreichen

  this.create = function() {
    var refObj = refModel.create();
    this.ref = function() { return refObj; }  // definition von der .ref()-Methode
    return this.ref();
  }

  // load object
  // todo: soll erst verfügbar sein, wenns auch was zum laden gibt
  this.loadQ = function() {
    var loadScope = this;

    var deferred = Q.defer();
    if (this._reference === undefined) {
      deferred.reject(new Error("Reference not set! Don't now what to load!"));
      return deferred.promise;
    }

    return refModel.getQ(this._reference)
      .then(function(obj) {
        var refObj = obj;
        loadScope.ref = function() { return refObj; }  // definition von der .ref()-Methode

        return refObj;
      });
  };

  this.load = this.loadQ;

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

Model.prototype.arrayReferenceRoot = function(refModel, obj, arrayName) {
  var theArryRef = obj[arrayName];
  assert(Array.isArray(theArryRef));
  var self = this;

  theArryRef.iterate = function(callback) {
    var loadPromises = [];
    for (var i=0; i<theArryRef.length; i++) {
      loadPromises.push(
        theArryRef[i].loadQ()
          .then(function (el) {
            return callback(el);  
          })
      )
    }

    return Q.all(loadPromises);
  };


  theArryRef.create = function() {
    return self.createArrayReferenceElement(refModel, obj, arrayName)();
  };  
};

// Many-Referenzen (das laden aus der DB)
Model.prototype.arrayReference = function(refModel, parentModel) {
  //refModel.connection(parentModel.connector);  // mongodb connection an child modell durchreichen

  this.loadQ = function() {   //TODO: ist ja genau das selbe Load wie beim reference!!
    var loadScope = this;

    var deferred = Q.defer();
    if (this._reference === undefined) {
      deferred.reject(new Error("Reference not set! Don't now what to load!"));
      return deferred.promise;
    }

    return refModel.getQ(this._reference)
      .then(function(obj) {
        var refObj = obj;
        loadScope.ref = function() { return refObj; }  // definition von der .ref()-Methode
        return refObj;
      });
  };

  this.load = this.loadQ;

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


Model.prototype.createArrayElement = function(arrayModel, obj, arrayName, rootObject) {
  // Das hier ist die Funktion um ein neues Array Element anzulegen
  return function() {
    var el = arrayModel._initObject(rootObject); // creates the new element

    // add an unique id for each object in the array,
    // to enable linking to that object
    el._id = ObjectId();

    // add the element to the lookup-table
    rootObject._childObjs[el._id] = el;

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

//      if (!obj.hasOwnProperty(model.attrs[i].name)) {  // check for error in usage!
//        console.log("Warning: Attribute '"+ model.attrs[i].name +"' not provided in your object (model '"+model.modelName+"')");
//        console.log("  Attribute will be set to null! Use '"+model.modelName+".create()' to avoid this problem!");
//        obj[model.attrs[i].name] = null;
//      }
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

      if (obj[i]._reference) {  // es ist gerade nicht geladen, hat aber eine _reference-id
        doc[i]._reference = obj[i]._reference;
      }

      if (obj[i].ref !== undefined && obj[i].ref()._id !== undefined) {  // wenn das referenzierte Object existiert und bereits gespeichert wurde
        obj[i]._reference = obj[i].ref()._id;  // die reference id an das object geben
        doc[i]._reference = obj[i].ref()._id;  // die reference id mit persisieren
      }

      //obj[i] = doc[i];  // copy back to obj
    }

    // Speichern (vorbereiten) von Link-Attributen
    for (var i in model.attrLinks) {
      doc[i] = {};

      if (obj[i]._link) {
        doc[i]._link = obj[i]._link;
      }
    }

    // Speichern (vorbereiten) von Referenz-Arrays
    for (var i in model.attrRefArrays) {  // über alle Referenz Arrays die in meinem Modell vorkommen
      check(obj[i] instanceof Object, i + " not correctly provided");

      doc[i] = [];  // copy only the references


      var refArray = obj[i];
      for (var j=0; j<refArray.length; j++) {  // über die einzelnen Elemente dieses Arrays
        var ref = refArray[j];

        if (obj[i][j]._reference) {  // es ist gerade nicht geladen, hat aber eine _reference-id
          doc[i][j] = {};
          doc[i][j]._reference = obj[i][j]._reference;
        }

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
  obj.saveQ = function() {
    var deferred = Q.defer();

    try {
      var doc = prepareSave(obj, self);
    } catch (e) {
      deferred.reject(e);
      return deferred.promise;
    }

    // transform the object to a document
    // and apply attribute filters
    return self.saveQ(doc)  // store the document
      .then(function(resDoc) {
        // Achtung: client gibt hier ein string zurück
        if (resDoc != 1) {  // doc is 1 if an insert was performed
          obj._id = resDoc._id;  // store the generated Mongo-ObjectId to the local context
        }

        return obj;
      });
  };

  obj.save = obj.saveQ;  // compatibility


  obj.removeQ = function() {
    var deferred = Q.defer();

    if (obj._id === undefined) {
      deferred.reject(new Error("Object seems not to been saved so far!"));
      return deferred.promise;
    }

    return self.removeQ(obj._id)
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

  obj.remove = obj.removeQ;  // compatibility

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

  // lookup table of child objects
  obj._childObjs = {};

  obj.getChild = function(id) {
    return obj._childObjs[id];
  }

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

  coll.saveQ = function() {
    for (var i=0; i<coll.length; i++) {
      coll[i].saveQ().done();
    }
  }

  return coll;
}


// Diese Funktion fügt alles aus dem Modell in ein neues Object hinzu
Model.prototype._initObject = function(rootObject) {
  var obj = new Object();  // das wird usere Modell-Instanz

  rootObject = rootObject || obj;

  // create the attributes
  for(var i in this.attrs) {
    obj[this.attrs[i].name] = null;
  }

  for (var i in this.virtualAttrs) {
    obj[this.virtualAttrs[i].name] = null;
  }

  // create Attribute Objects (a sub structure)
  for(var i in this.attrObjs) {
    var attrObj = this.attrObjs[i]._initObject(rootObject);
    obj[i] = attrObj;
  }

  // create a reference to another model
  for(var i in this.attrRefs) {
    var modelRef = this.attrRefs[i];
    obj[i] = new this.reference(modelRef, this);
  }

  // create a links to objects
  for(var i in this.attrLinks) {
    var link = this.attrLinks[i];
    obj[i] = new this.link(link.model, link.link);
  }

  // create a reference Array to another model
  for(var i in this.attrRefArrays) {
    var modelRef = this.attrRefArrays[i];  // Das Model auf das referenziert wird
    var arrayName = i;

    obj[i] = [];  // init with empty array
    this.arrayReferenceRoot(modelRef, obj, i);  //init arrayRef helper functions

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
    obj["create" + arrayName] = this.createArrayElement(this.attrArrays[i], obj, i, rootObject);

    //obj[i].create = this.createArrayElement(this.attrArrays[i], obj, i);  // add create method directly on the array
  }

  return obj;
};


Model.prototype.readFilter = function(fn) {
  this.readFilters.push(fn);
};

Model.prototype.afterReadFilter = function(fn) {
  this.afterReadFilters = fn;
}


// create the filter hash (mongo search string)
Model.prototype._getReadFilter = function(req) {
  var res = {};
  var bool_res = null;

  var promises = [];

  for (var i=0; i<this.readFilters.length; i++) {  // alle filter
    promises.push(Q(this.readFilters[i](req))
      .then(function(filter) {
        if (filter === false) bool_res = false;
        if (filter === true) bool_res = true;

        // copy content
        for (var j in filter) {
          res[j] = filter[j];
        }

      }))
  }

  return Q.all(promises)
    .then(function() {
      if (bool_res === null)
        return res
      else return bool_res;
    })
}


Model.prototype.writeFilter = function(fn) {
  this.writeFilters.push(fn);
}


// create the filter hash (mongo search string)
Model.prototype._getWriteFilter = function(obj, req) {
  var res = {};
  var bool_res = null;

  var promises = [];

  for (var i=0; i<this.writeFilters.length; i++) {  // alle filter
    promises.push(Q(this.writeFilters[i](obj, req))
      .then(function (filter) {
        if (filter === false) bool_res = false;
        if (filter === true) bool_res = true;

        // copy content
        for (var j in filter) {
          res[j] = filter[j];
        }

      }))
  }

  return Q.all(promises)
    .then(function() {
      if (bool_res === null)
        return res
      else return bool_res;
    })
}

// Using the model (static functions)

Model.prototype.loadFromDoc = function(doc, initObj) {
  var rootObj = initObj || this.create();

  // TODO: das hier überschreibt ja alle Methoden
  // da muss ich mir was besseres überlegen


  var copy = function(obj, doc, model) {
    if (!doc) {  // doc missing
      doc = {};  // use empty one
      if (!obj) {
        obj = {};
      }
    }


    for (var i in doc) {  // kopiere alles was von der Datenquelle kommt
      obj[i] = doc[i];    // todo remove
    }

    for (var i in model.attrs) {
        obj[i] = doc[i];
    }

    // copy Attribute Objects (a sub structure)
    for(var i in model.attrObjs) {
      copy(obj[i], doc[i], model.attrObjs[i]);  // recursive
    }

     // create stuff for attrArrays
    for (var i in model.attrArrays) {

      if (doc[i] === undefined || doc[i] === null) {
        obj[i] = [];
      }

      // jedes element kopieren
      for (var j=0; j<doc[i].length; j++) {
        copy(obj[i][j], doc[i][j], model.attrArrays[i]);
      }

      var arrayName = i;
      arrayName = arrayName[0].toUpperCase() + arrayName.substr(1);
      obj["create" + arrayName] = model.createArrayElement(model.attrArrays[i], obj, i, rootObj);

  //    obj[i].create = this.createArrayElement(this.attrArrays[i], obj, i);  // add create method directly on the array
    }


    // TODO: hier kopierere ich teilweise _initObject verhalten (-> kapseln )
    // TODO: big todo!!

    // hier kümmere ich mich um die Referenzen
    for(var j in model.attrRefs) {
      var modelRef = model.attrRefs[j];
      var ref_id = obj[j]._reference;
      obj[j] = new model.reference(modelRef, model);
      obj[j]._reference = ref_id;
    }

    for(var j in model.attrLinks) {
      var link = model.attrLinks[j];
      var link_id = obj[j]._link;
      obj[j] = new model.link(link.model, link.link);
      if (link_id) {
        obj[j]._link = link_id;
      }
    }

    // hier kümmere ich mich um Referenz-Arrays
    for(var j in model.attrRefArrays) {
      var modelRef = model.attrRefArrays[j];
      var refArray = obj[j];

      assert(typeof refArray.length === 'number');
      for (var k=0; k<refArray.length; k++) {
        var ref = refArray[k];
        var ref_id = ref._reference;   // _reference retten
        obj[j][k] = new model.arrayReference(modelRef, model);
        obj[j][k]._reference = ref_id;       // zurück speichern
      }
      model.arrayReferenceRoot(modelRef, obj, j);
    }

    // TODO: kopieren von anderen Methoden die durch das kopieren oben überschrieben werden

    // store a reference of this object in the lookup-table
    if (doc._id && doc._id != rootObj._id) { // but don't store the rootObj
      rootObj._childObjs[doc._id] = obj;
    }
  };

  copy(rootObj, doc, this);

  return rootObj;
};


// todo: conflict with angular-client
Model.prototype.$get = function(id) {
  var self = this;

  this.getQ(id)
    .then(function(obj) {
      self.store.set(obj);
    })
    .fail(function(err) {
      if (err.message == "Object not found!") {
        self.store.del(id);
      }
    });

  return this.store.get(id);  // todo: was tun wenns id nicht gibt -> fail
};

Model.prototype.getQ = function(id, initObj) {
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

    Q(self.afterReadFilters(obj))
      .then(function () {
        deferred.resolve(obj);
      })
  });

  return deferred.promise;
};

Model.prototype.get = Model.prototype.getQ;


Model.prototype.findOneQ = function(search, initObj) {
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

    Q(self.afterReadFilters(obj))
      .then(function () {
        deferred.resolve(obj);
      });

  });

  return deferred.promise;
};

Model.prototype.findOneQ = Model.prototype.findOne;


Model.prototype.findQ = function(search, initObj) {
  var self = this;
  var deferred = Q.defer();

  self.collection.find(search, function(err, docs) {
    if (err) return deferred.reject(err);
    var objs = initObj || self.createCollection();
    var promises = [];

    // für jedes document in der DB ein object anlegen
    for (var i=0; i<docs.length; i++) {
      (function() {  // extra closure für obj
        var doc = docs[i];
        var obj = self.loadFromDoc(doc);

        promises.push(
          Q(self.afterReadFilters(obj))
            .then(function () {
              objs.push(obj);
            })
        );
      })();
    }

    return Q.all(promises)
      .then(function() {
        deferred.resolve(objs);
      })
  });

  return deferred.promise;
};

Model.prototype.find = Model.prototype.findQ;

Model.prototype.$all = function() {
  return this.store.all();
}

Model.prototype.allQ = function(initObj) {
  return this.findQ({}, initObj);
};

Model.prototype.all = Model.prototype.allQ;


Model.prototype.saveQ = function(obj) {
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

Model.prototype.save = Model.prototype.saveQ;

Model.prototype.removeQ = function(id) {
  var deferred = Q.defer();
  this.collection.remove({_id:id}, true, function(err, result) {
    if (err) {
      deferred.reject(new Error('Failed to remove document!'));
      return;
    }

    if (result.status == "OK") {  // success from a client call
      deferred.resolve();
      return;
    }

    // TODO: das hat wohl was mit der express send funktion zu tun, wenn parameter fehlen
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

Model.prototype.remove = Model.prototype.removeQ;


Model.prototype.callOpQ = function(operationName, params, HTMLrequest) {
  return this.collection.callOperation(operationName, params, HTMLrequest);
};

Model.prototype.callOp = Model.prototype.callOpQ;

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

  // remove obj lookup-table
  delete doc['_childObjs'];
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

      // it is a virutal attribute
    } else if (value._what == 'virtualAttr') {
      this.virtualAttr(entry);

      // it is a reference to another model
    } else if (value._what == 'attrRef') {
      this.attrRef(entry, value.ref);

      // it is a link to an object
    } else if (value._what == 'attrLink') {
      this.attrLink(entry, value.model, value.link);

      // it is a many Reference to another model
    } else if (value._what == 'attrRefArray') {
      this.attrRefArray(entry, value.ref);

      // it is an array with objects
    } else if (value._what == 'attrObjArray') {
      this.attrArray(entry, value.ref);

      // it is a operation definition
      // todo parameter validation
    } else if (value._what == 'operation') {
      this.operation(entry);

    } else if (value._what == 'method') {
        this.method(entry);
        this.methodImpl(entry, value.impl);

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

Model.VirtualAttr = function() {
  return {
    '_what' : 'virtualAttr'
  };
};

Model.Ref = function(reference) {
  return {
    '_what' : 'attrRef',
    ref : reference
  };
};

Model.Link = function(model, link) {
  return {
    '_what' : 'attrLink',
    model : model,
    link : link
  };
};

Model.RefArray = function(reference) {
  return {
    '_what' : 'attrRefArray',
    ref : reference
  }
};

Model.ObjArray = function(reference) {
  return {
    '_what' : 'attrObjArray',
    ref : reference
  }
};

Model.Operation = function() {
  return {
    '_what' : 'operation'
  }
};

Model.Factory = function() {
    return {
        '_what' : 'factory'
    }
};

Model.Method = function(impl) {
    return {
        '_what' : 'method',
        impl : impl
    }
};

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

Model.Attr.required = function(def) {
  return function (value) {
    if (value === undefined || value === null || value === "") {
      throw new Error("Value has to be not null");
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


// all implementieren
// eigentlich ist model-def ein aspekt
// und von den aspekten gibts viele

module.exports = Model;

/*
if (typeof window === 'undefined') {
  module.exports = Model;

} else {
  window.require = function(content) {
    if (content.indexOf('modelizer') != -1) return Model;
  }
}
*/
},{"./microlibs":3,"./objectid":"H6+VjG","q":"qLuPo1"}],5:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],"H6+VjG":[function(require,module,exports){
/*
*
* Copyright (c) 2011 Justin Dearing (zippy1981@gmail.com)
* Dual licensed under the MIT (http://www.opensource.org/licenses/mit-license.php)
* and GPL (http://www.opensource.org/licenses/gpl-license.php) version 2 licenses.
* This software is not distributed under version 3 or later of the GPL.
*
* Version 1.0.1-dev

* Changes made by Jonathan Häberle (jonathan.haeberle@gmail.com)
* Published to BPM for browserify-usage
*
*/

/**
 * Javascript class that mimics how WCF serializes a object of type MongoDB.Bson.ObjectId
 * and converts between that format and the standard 24 character representation.
*/
var ObjectId = (function () {
    var increment = 0;
    var pid = Math.floor(Math.random() * (32767));
    var machine = Math.floor(Math.random() * (16777216));

    if (typeof (localStorage) != 'undefined') {
        var mongoMachineId = parseInt(localStorage['mongoMachineId']);
        if (mongoMachineId >= 0 && mongoMachineId <= 16777215) {
            machine = Math.floor(localStorage['mongoMachineId']);
        }
        // Just always stick the value in.
        localStorage['mongoMachineId'] = machine;
        document.cookie = 'mongoMachineId=' + machine + ';expires=Tue, 19 Jan 2038 05:00:00 GMT'
    }
    else {
        var cookieList = document.cookie.split('; ');
        for (var i in cookieList) {
            var cookie = cookieList[i].split('=');
            if (cookie[0] == 'mongoMachineId' && cookie[1] >= 0 && cookie[1] <= 16777215) {
                machine = cookie[1];
                break;
            }
        }
        document.cookie = 'mongoMachineId=' + machine + ';expires=Tue, 19 Jan 2038 05:00:00 GMT';

    }

    function ObjId() {
        if (!(this instanceof ObjectId)) {
            return new ObjectId(arguments[0], arguments[1], arguments[2], arguments[3]).toString();
        }

        if (typeof (arguments[0]) == 'object') {
            this.timestamp = arguments[0].timestamp;
            this.machine = arguments[0].machine;
            this.pid = arguments[0].pid;
            this.increment = arguments[0].increment;
        }
        else if (typeof (arguments[0]) == 'string' && arguments[0].length == 24) {
            this.timestamp = Number('0x' + arguments[0].substr(0, 8)),
            this.machine = Number('0x' + arguments[0].substr(8, 6)),
            this.pid = Number('0x' + arguments[0].substr(14, 4)),
            this.increment = Number('0x' + arguments[0].substr(18, 6))
        }
        else if (arguments.length == 4 && arguments[0] != null) {
            this.timestamp = arguments[0];
            this.machine = arguments[1];
            this.pid = arguments[2];
            this.increment = arguments[3];
        }
        else {
            this.timestamp = Math.floor(new Date().valueOf() / 1000);
            this.machine = machine;
            this.pid = pid;
            this.increment = increment++;
            if (increment > 0xffffff) {
                increment = 0;
            }
        }
    };
    return ObjId;
})();

ObjectId.prototype.getDate = function () {
    return new Date(this.timestamp * 1000);
};

ObjectId.prototype.toArray = function () {
    var strOid = this.toString();
    var array = [];
    var i;
    for(i = 0; i < 12; i++) {
        array[i] = parseInt(strOid.slice(i*2, i*2+2), 16);
    }
    return array;
};

/**
* Turns a WCF representation of a BSON ObjectId into a 24 character string representation.
*/
ObjectId.prototype.toString = function () {
    var timestamp = this.timestamp.toString(16);
    var machine = this.machine.toString(16);
    var pid = this.pid.toString(16);
    var increment = this.increment.toString(16);
    return '00000000'.substr(0, 8 - timestamp.length) + timestamp +
           '000000'.substr(0, 6 - machine.length) + machine +
           '0000'.substr(0, 4 - pid.length) + pid +
           '000000'.substr(0, 6 - increment.length) + increment;
};

module.exports = ObjectId;


},{}],"./objectid":[function(require,module,exports){
module.exports=require('H6+VjG');
},{}],"qLuPo1":[function(require,module,exports){
(function (process){
// vim:ts=4:sts=4:sw=4:
/*!
 *
 * Copyright 2009-2012 Kris Kowal under the terms of the MIT
 * license found at http://github.com/kriskowal/q/raw/master/LICENSE
 *
 * With parts by Tyler Close
 * Copyright 2007-2009 Tyler Close under the terms of the MIT X license found
 * at http://www.opensource.org/licenses/mit-license.html
 * Forked at ref_send.js version: 2009-05-11
 *
 * With parts by Mark Miller
 * Copyright (C) 2011 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

(function (definition) {
    // Turn off strict mode for this function so we can assign to global.Q
    /* jshint strict: false */

    // This file will function properly as a <script> tag, or a module
    // using CommonJS and NodeJS or RequireJS module formats.  In
    // Common/Node/RequireJS, the module exports the Q API and when
    // executed as a simple <script>, it creates a Q global instead.

    // Montage Require
    if (typeof bootstrap === "function") {
        bootstrap("promise", definition);

    // CommonJS
    } else if (typeof exports === "object") {
        module.exports = definition();

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
        define(definition);

    // SES (Secure EcmaScript)
    } else if (typeof ses !== "undefined") {
        if (!ses.ok()) {
            return;
        } else {
            ses.makeQ = definition;
        }

    // <script>
    } else {
        Q = definition();
    }

})(function () {
"use strict";

var hasStacks = false;
try {
    throw new Error();
} catch (e) {
    hasStacks = !!e.stack;
}

// All code after this point will be filtered from stack traces reported
// by Q.
var qStartingLine = captureLine();
var qFileName;

// shims

// used for fallback in "allResolved"
var noop = function () {};

// Use the fastest possible means to execute a task in a future turn
// of the event loop.
var nextTick =(function () {
    // linked list of tasks (single, with head node)
    var head = {task: void 0, next: null};
    var tail = head;
    var flushing = false;
    var requestTick = void 0;
    var isNodeJS = false;

    function flush() {
        /* jshint loopfunc: true */

        while (head.next) {
            head = head.next;
            var task = head.task;
            head.task = void 0;
            var domain = head.domain;

            if (domain) {
                head.domain = void 0;
                domain.enter();
            }

            try {
                task();

            } catch (e) {
                if (isNodeJS) {
                    // In node, uncaught exceptions are considered fatal errors.
                    // Re-throw them synchronously to interrupt flushing!

                    // Ensure continuation if the uncaught exception is suppressed
                    // listening "uncaughtException" events (as domains does).
                    // Continue in next event to avoid tick recursion.
                    if (domain) {
                        domain.exit();
                    }
                    setTimeout(flush, 0);
                    if (domain) {
                        domain.enter();
                    }

                    throw e;

                } else {
                    // In browsers, uncaught exceptions are not fatal.
                    // Re-throw them asynchronously to avoid slow-downs.
                    setTimeout(function() {
                       throw e;
                    }, 0);
                }
            }

            if (domain) {
                domain.exit();
            }
        }

        flushing = false;
    }

    nextTick = function (task) {
        tail = tail.next = {
            task: task,
            domain: isNodeJS && process.domain,
            next: null
        };

        if (!flushing) {
            flushing = true;
            requestTick();
        }
    };

    if (typeof process !== "undefined" && process.nextTick) {
        // Node.js before 0.9. Note that some fake-Node environments, like the
        // Mocha test runner, introduce a `process` global without a `nextTick`.
        isNodeJS = true;

        requestTick = function () {
            process.nextTick(flush);
        };

    } else if (typeof setImmediate === "function") {
        // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
        if (typeof window !== "undefined") {
            requestTick = setImmediate.bind(window, flush);
        } else {
            requestTick = function () {
                setImmediate(flush);
            };
        }

    } else if (typeof MessageChannel !== "undefined") {
        // modern browsers
        // http://www.nonblocking.io/2011/06/windownexttick.html
        var channel = new MessageChannel();
        // At least Safari Version 6.0.5 (8536.30.1) intermittently cannot create
        // working message ports the first time a page loads.
        channel.port1.onmessage = function () {
            requestTick = requestPortTick;
            channel.port1.onmessage = flush;
            flush();
        };
        var requestPortTick = function () {
            // Opera requires us to provide a message payload, regardless of
            // whether we use it.
            channel.port2.postMessage(0);
        };
        requestTick = function () {
            setTimeout(flush, 0);
            requestPortTick();
        };

    } else {
        // old browsers
        requestTick = function () {
            setTimeout(flush, 0);
        };
    }

    return nextTick;
})();

// Attempt to make generics safe in the face of downstream
// modifications.
// There is no situation where this is necessary.
// If you need a security guarantee, these primordials need to be
// deeply frozen anyway, and if you don’t need a security guarantee,
// this is just plain paranoid.
// However, this does have the nice side-effect of reducing the size
// of the code by reducing x.call() to merely x(), eliminating many
// hard-to-minify characters.
// See Mark Miller’s explanation of what this does.
// http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
var call = Function.call;
function uncurryThis(f) {
    return function () {
        return call.apply(f, arguments);
    };
}
// This is equivalent, but slower:
// uncurryThis = Function_bind.bind(Function_bind.call);
// http://jsperf.com/uncurrythis

var array_slice = uncurryThis(Array.prototype.slice);

var array_reduce = uncurryThis(
    Array.prototype.reduce || function (callback, basis) {
        var index = 0,
            length = this.length;
        // concerning the initial value, if one is not provided
        if (arguments.length === 1) {
            // seek to the first value in the array, accounting
            // for the possibility that is is a sparse array
            do {
                if (index in this) {
                    basis = this[index++];
                    break;
                }
                if (++index >= length) {
                    throw new TypeError();
                }
            } while (1);
        }
        // reduce
        for (; index < length; index++) {
            // account for the possibility that the array is sparse
            if (index in this) {
                basis = callback(basis, this[index], index);
            }
        }
        return basis;
    }
);

var array_indexOf = uncurryThis(
    Array.prototype.indexOf || function (value) {
        // not a very good shim, but good enough for our one use of it
        for (var i = 0; i < this.length; i++) {
            if (this[i] === value) {
                return i;
            }
        }
        return -1;
    }
);

var array_map = uncurryThis(
    Array.prototype.map || function (callback, thisp) {
        var self = this;
        var collect = [];
        array_reduce(self, function (undefined, value, index) {
            collect.push(callback.call(thisp, value, index, self));
        }, void 0);
        return collect;
    }
);

var object_create = Object.create || function (prototype) {
    function Type() { }
    Type.prototype = prototype;
    return new Type();
};

var object_hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);

var object_keys = Object.keys || function (object) {
    var keys = [];
    for (var key in object) {
        if (object_hasOwnProperty(object, key)) {
            keys.push(key);
        }
    }
    return keys;
};

var object_toString = uncurryThis(Object.prototype.toString);

function isObject(value) {
    return value === Object(value);
}

// generator related shims

// FIXME: Remove this function once ES6 generators are in SpiderMonkey.
function isStopIteration(exception) {
    return (
        object_toString(exception) === "[object StopIteration]" ||
        exception instanceof QReturnValue
    );
}

// FIXME: Remove this helper and Q.return once ES6 generators are in
// SpiderMonkey.
var QReturnValue;
if (typeof ReturnValue !== "undefined") {
    QReturnValue = ReturnValue;
} else {
    QReturnValue = function (value) {
        this.value = value;
    };
}

// Until V8 3.19 / Chromium 29 is released, SpiderMonkey is the only
// engine that has a deployed base of browsers that support generators.
// However, SM's generators use the Python-inspired semantics of
// outdated ES6 drafts.  We would like to support ES6, but we'd also
// like to make it possible to use generators in deployed browsers, so
// we also support Python-style generators.  At some point we can remove
// this block.
var hasES6Generators;
try {
    /* jshint evil: true, nonew: false */
    new Function("(function* (){ yield 1; })");
    hasES6Generators = true;
} catch (e) {
    hasES6Generators = false;
}

// long stack traces

var STACK_JUMP_SEPARATOR = "From previous event:";

function makeStackTraceLong(error, promise) {
    // If possible, transform the error stack trace by removing Node and Q
    // cruft, then concatenating with the stack trace of `promise`. See #57.
    if (hasStacks &&
        promise.stack &&
        typeof error === "object" &&
        error !== null &&
        error.stack &&
        error.stack.indexOf(STACK_JUMP_SEPARATOR) === -1
    ) {
        var stacks = [];
        for (var p = promise; !!p; p = p.source) {
            if (p.stack) {
                stacks.unshift(p.stack);
            }
        }
        stacks.unshift(error.stack);

        var concatedStacks = stacks.join("\n" + STACK_JUMP_SEPARATOR + "\n");
        error.stack = filterStackString(concatedStacks);
    }
}

function filterStackString(stackString) {
    var lines = stackString.split("\n");
    var desiredLines = [];
    for (var i = 0; i < lines.length; ++i) {
        var line = lines[i];

        if (!isInternalFrame(line) && !isNodeFrame(line) && line) {
            desiredLines.push(line);
        }
    }
    return desiredLines.join("\n");
}

function isNodeFrame(stackLine) {
    return stackLine.indexOf("(module.js:") !== -1 ||
           stackLine.indexOf("(node.js:") !== -1;
}

function getFileNameAndLineNumber(stackLine) {
    // Named functions: "at functionName (filename:lineNumber:columnNumber)"
    // In IE10 function name can have spaces ("Anonymous function") O_o
    var attempt1 = /at .+ \((.+):(\d+):(?:\d+)\)$/.exec(stackLine);
    if (attempt1) {
        return [attempt1[1], Number(attempt1[2])];
    }

    // Anonymous functions: "at filename:lineNumber:columnNumber"
    var attempt2 = /at ([^ ]+):(\d+):(?:\d+)$/.exec(stackLine);
    if (attempt2) {
        return [attempt2[1], Number(attempt2[2])];
    }

    // Firefox style: "function@filename:lineNumber or @filename:lineNumber"
    var attempt3 = /.*@(.+):(\d+)$/.exec(stackLine);
    if (attempt3) {
        return [attempt3[1], Number(attempt3[2])];
    }
}

function isInternalFrame(stackLine) {
    var fileNameAndLineNumber = getFileNameAndLineNumber(stackLine);

    if (!fileNameAndLineNumber) {
        return false;
    }

    var fileName = fileNameAndLineNumber[0];
    var lineNumber = fileNameAndLineNumber[1];

    return fileName === qFileName &&
        lineNumber >= qStartingLine &&
        lineNumber <= qEndingLine;
}

// discover own file name and line number range for filtering stack
// traces
function captureLine() {
    if (!hasStacks) {
        return;
    }

    try {
        throw new Error();
    } catch (e) {
        var lines = e.stack.split("\n");
        var firstLine = lines[0].indexOf("@") > 0 ? lines[1] : lines[2];
        var fileNameAndLineNumber = getFileNameAndLineNumber(firstLine);
        if (!fileNameAndLineNumber) {
            return;
        }

        qFileName = fileNameAndLineNumber[0];
        return fileNameAndLineNumber[1];
    }
}

function deprecate(callback, name, alternative) {
    return function () {
        if (typeof console !== "undefined" &&
            typeof console.warn === "function") {
            console.warn(name + " is deprecated, use " + alternative +
                         " instead.", new Error("").stack);
        }
        return callback.apply(callback, arguments);
    };
}

// end of shims
// beginning of real work

/**
 * Constructs a promise for an immediate reference, passes promises through, or
 * coerces promises from different systems.
 * @param value immediate reference or promise
 */
function Q(value) {
    // If the object is already a Promise, return it directly.  This enables
    // the resolve function to both be used to created references from objects,
    // but to tolerably coerce non-promises to promises.
    if (isPromise(value)) {
        return value;
    }

    // assimilate thenables
    if (isPromiseAlike(value)) {
        return coerce(value);
    } else {
        return fulfill(value);
    }
}
Q.resolve = Q;

/**
 * Performs a task in a future turn of the event loop.
 * @param {Function} task
 */
Q.nextTick = nextTick;

/**
 * Controls whether or not long stack traces will be on
 */
Q.longStackSupport = false;

/**
 * Constructs a {promise, resolve, reject} object.
 *
 * `resolve` is a callback to invoke with a more resolved value for the
 * promise. To fulfill the promise, invoke `resolve` with any value that is
 * not a thenable. To reject the promise, invoke `resolve` with a rejected
 * thenable, or invoke `reject` with the reason directly. To resolve the
 * promise to another thenable, thus putting it in the same state, invoke
 * `resolve` with that other thenable.
 */
Q.defer = defer;
function defer() {
    // if "messages" is an "Array", that indicates that the promise has not yet
    // been resolved.  If it is "undefined", it has been resolved.  Each
    // element of the messages array is itself an array of complete arguments to
    // forward to the resolved promise.  We coerce the resolution value to a
    // promise using the `resolve` function because it handles both fully
    // non-thenable values and other thenables gracefully.
    var messages = [], progressListeners = [], resolvedPromise;

    var deferred = object_create(defer.prototype);
    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, operands) {
        var args = array_slice(arguments);
        if (messages) {
            messages.push(args);
            if (op === "when" && operands[1]) { // progress operand
                progressListeners.push(operands[1]);
            }
        } else {
            nextTick(function () {
                resolvedPromise.promiseDispatch.apply(resolvedPromise, args);
            });
        }
    };

    // XXX deprecated
    promise.valueOf = deprecate(function () {
        if (messages) {
            return promise;
        }
        var nearerValue = nearer(resolvedPromise);
        if (isPromise(nearerValue)) {
            resolvedPromise = nearerValue; // shorten chain
        }
        return nearerValue;
    }, "valueOf", "inspect");

    promise.inspect = function () {
        if (!resolvedPromise) {
            return { state: "pending" };
        }
        return resolvedPromise.inspect();
    };

    if (Q.longStackSupport && hasStacks) {
        try {
            throw new Error();
        } catch (e) {
            // NOTE: don't try to use `Error.captureStackTrace` or transfer the
            // accessor around; that causes memory leaks as per GH-111. Just
            // reify the stack trace as a string ASAP.
            //
            // At the same time, cut off the first line; it's always just
            // "[object Promise]\n", as per the `toString`.
            promise.stack = e.stack.substring(e.stack.indexOf("\n") + 1);
        }
    }

    // NOTE: we do the checks for `resolvedPromise` in each method, instead of
    // consolidating them into `become`, since otherwise we'd create new
    // promises with the lines `become(whatever(value))`. See e.g. GH-252.

    function become(newPromise) {
        resolvedPromise = newPromise;
        promise.source = newPromise;

        array_reduce(messages, function (undefined, message) {
            nextTick(function () {
                newPromise.promiseDispatch.apply(newPromise, message);
            });
        }, void 0);

        messages = void 0;
        progressListeners = void 0;
    }

    deferred.promise = promise;
    deferred.resolve = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(Q(value));
    };

    deferred.fulfill = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(fulfill(value));
    };
    deferred.reject = function (reason) {
        if (resolvedPromise) {
            return;
        }

        become(reject(reason));
    };
    deferred.notify = function (progress) {
        if (resolvedPromise) {
            return;
        }

        array_reduce(progressListeners, function (undefined, progressListener) {
            nextTick(function () {
                progressListener(progress);
            });
        }, void 0);
    };

    return deferred;
}

/**
 * Creates a Node-style callback that will resolve or reject the deferred
 * promise.
 * @returns a nodeback
 */
defer.prototype.makeNodeResolver = function () {
    var self = this;
    return function (error, value) {
        if (error) {
            self.reject(error);
        } else if (arguments.length > 2) {
            self.resolve(array_slice(arguments, 1));
        } else {
            self.resolve(value);
        }
    };
};

/**
 * @param resolver {Function} a function that returns nothing and accepts
 * the resolve, reject, and notify functions for a deferred.
 * @returns a promise that may be resolved with the given resolve and reject
 * functions, or rejected by a thrown exception in resolver
 */
Q.promise = promise;
function promise(resolver) {
    if (typeof resolver !== "function") {
        throw new TypeError("resolver must be a function.");
    }
    var deferred = defer();
    try {
        resolver(deferred.resolve, deferred.reject, deferred.notify);
    } catch (reason) {
        deferred.reject(reason);
    }
    return deferred.promise;
}

// XXX experimental.  This method is a way to denote that a local value is
// serializable and should be immediately dispatched to a remote upon request,
// instead of passing a reference.
Q.passByCopy = function (object) {
    //freeze(object);
    //passByCopies.set(object, true);
    return object;
};

Promise.prototype.passByCopy = function () {
    //freeze(object);
    //passByCopies.set(object, true);
    return this;
};

/**
 * If two promises eventually fulfill to the same value, promises that value,
 * but otherwise rejects.
 * @param x {Any*}
 * @param y {Any*}
 * @returns {Any*} a promise for x and y if they are the same, but a rejection
 * otherwise.
 *
 */
Q.join = function (x, y) {
    return Q(x).join(y);
};

Promise.prototype.join = function (that) {
    return Q([this, that]).spread(function (x, y) {
        if (x === y) {
            // TODO: "===" should be Object.is or equiv
            return x;
        } else {
            throw new Error("Can't join: not the same: " + x + " " + y);
        }
    });
};

/**
 * Returns a promise for the first of an array of promises to become fulfilled.
 * @param answers {Array[Any*]} promises to race
 * @returns {Any*} the first promise to be fulfilled
 */
Q.race = race;
function race(answerPs) {
    return promise(function(resolve, reject) {
        // Switch to this once we can assume at least ES5
        // answerPs.forEach(function(answerP) {
        //     Q(answerP).then(resolve, reject);
        // });
        // Use this in the meantime
        for (var i = 0, len = answerPs.length; i < len; i++) {
            Q(answerPs[i]).then(resolve, reject);
        }
    });
}

Promise.prototype.race = function () {
    return this.then(Q.race);
};

/**
 * Constructs a Promise with a promise descriptor object and optional fallback
 * function.  The descriptor contains methods like when(rejected), get(name),
 * set(name, value), post(name, args), and delete(name), which all
 * return either a value, a promise for a value, or a rejection.  The fallback
 * accepts the operation name, a resolver, and any further arguments that would
 * have been forwarded to the appropriate method above had a method been
 * provided with the proper name.  The API makes no guarantees about the nature
 * of the returned object, apart from that it is usable whereever promises are
 * bought and sold.
 */
Q.makePromise = Promise;
function Promise(descriptor, fallback, inspect) {
    if (fallback === void 0) {
        fallback = function (op) {
            return reject(new Error(
                "Promise does not support operation: " + op
            ));
        };
    }
    if (inspect === void 0) {
        inspect = function () {
            return {state: "unknown"};
        };
    }

    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, args) {
        var result;
        try {
            if (descriptor[op]) {
                result = descriptor[op].apply(promise, args);
            } else {
                result = fallback.call(promise, op, args);
            }
        } catch (exception) {
            result = reject(exception);
        }
        if (resolve) {
            resolve(result);
        }
    };

    promise.inspect = inspect;

    // XXX deprecated `valueOf` and `exception` support
    if (inspect) {
        var inspected = inspect();
        if (inspected.state === "rejected") {
            promise.exception = inspected.reason;
        }

        promise.valueOf = deprecate(function () {
            var inspected = inspect();
            if (inspected.state === "pending" ||
                inspected.state === "rejected") {
                return promise;
            }
            return inspected.value;
        });
    }

    return promise;
}

Promise.prototype.toString = function () {
    return "[object Promise]";
};

Promise.prototype.then = function (fulfilled, rejected, progressed) {
    var self = this;
    var deferred = defer();
    var done = false;   // ensure the untrusted promise makes at most a
                        // single call to one of the callbacks

    function _fulfilled(value) {
        try {
            return typeof fulfilled === "function" ? fulfilled(value) : value;
        } catch (exception) {
            return reject(exception);
        }
    }

    function _rejected(exception) {
        if (typeof rejected === "function") {
            makeStackTraceLong(exception, self);
            try {
                return rejected(exception);
            } catch (newException) {
                return reject(newException);
            }
        }
        return reject(exception);
    }

    function _progressed(value) {
        return typeof progressed === "function" ? progressed(value) : value;
    }

    nextTick(function () {
        self.promiseDispatch(function (value) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_fulfilled(value));
        }, "when", [function (exception) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_rejected(exception));
        }]);
    });

    // Progress propagator need to be attached in the current tick.
    self.promiseDispatch(void 0, "when", [void 0, function (value) {
        var newValue;
        var threw = false;
        try {
            newValue = _progressed(value);
        } catch (e) {
            threw = true;
            if (Q.onerror) {
                Q.onerror(e);
            } else {
                throw e;
            }
        }

        if (!threw) {
            deferred.notify(newValue);
        }
    }]);

    return deferred.promise;
};

/**
 * Registers an observer on a promise.
 *
 * Guarantees:
 *
 * 1. that fulfilled and rejected will be called only once.
 * 2. that either the fulfilled callback or the rejected callback will be
 *    called, but not both.
 * 3. that fulfilled and rejected will not be called in this turn.
 *
 * @param value      promise or immediate reference to observe
 * @param fulfilled  function to be called with the fulfilled value
 * @param rejected   function to be called with the rejection exception
 * @param progressed function to be called on any progress notifications
 * @return promise for the return value from the invoked callback
 */
Q.when = when;
function when(value, fulfilled, rejected, progressed) {
    return Q(value).then(fulfilled, rejected, progressed);
}

Promise.prototype.thenResolve = function (value) {
    return this.then(function () { return value; });
};

Q.thenResolve = function (promise, value) {
    return Q(promise).thenResolve(value);
};

Promise.prototype.thenReject = function (reason) {
    return this.then(function () { throw reason; });
};

Q.thenReject = function (promise, reason) {
    return Q(promise).thenReject(reason);
};

/**
 * If an object is not a promise, it is as "near" as possible.
 * If a promise is rejected, it is as "near" as possible too.
 * If it’s a fulfilled promise, the fulfillment value is nearer.
 * If it’s a deferred promise and the deferred has been resolved, the
 * resolution is "nearer".
 * @param object
 * @returns most resolved (nearest) form of the object
 */

// XXX should we re-do this?
Q.nearer = nearer;
function nearer(value) {
    if (isPromise(value)) {
        var inspected = value.inspect();
        if (inspected.state === "fulfilled") {
            return inspected.value;
        }
    }
    return value;
}

/**
 * @returns whether the given object is a promise.
 * Otherwise it is a fulfilled value.
 */
Q.isPromise = isPromise;
function isPromise(object) {
    return isObject(object) &&
        typeof object.promiseDispatch === "function" &&
        typeof object.inspect === "function";
}

Q.isPromiseAlike = isPromiseAlike;
function isPromiseAlike(object) {
    return isObject(object) && typeof object.then === "function";
}

/**
 * @returns whether the given object is a pending promise, meaning not
 * fulfilled or rejected.
 */
Q.isPending = isPending;
function isPending(object) {
    return isPromise(object) && object.inspect().state === "pending";
}

Promise.prototype.isPending = function () {
    return this.inspect().state === "pending";
};

/**
 * @returns whether the given object is a value or fulfilled
 * promise.
 */
Q.isFulfilled = isFulfilled;
function isFulfilled(object) {
    return !isPromise(object) || object.inspect().state === "fulfilled";
}

Promise.prototype.isFulfilled = function () {
    return this.inspect().state === "fulfilled";
};

/**
 * @returns whether the given object is a rejected promise.
 */
Q.isRejected = isRejected;
function isRejected(object) {
    return isPromise(object) && object.inspect().state === "rejected";
}

Promise.prototype.isRejected = function () {
    return this.inspect().state === "rejected";
};

//// BEGIN UNHANDLED REJECTION TRACKING

// This promise library consumes exceptions thrown in handlers so they can be
// handled by a subsequent promise.  The exceptions get added to this array when
// they are created, and removed when they are handled.  Note that in ES6 or
// shimmed environments, this would naturally be a `Set`.
var unhandledReasons = [];
var unhandledRejections = [];
var unhandledReasonsDisplayed = false;
var trackUnhandledRejections = true;
function displayUnhandledReasons() {
    if (
        !unhandledReasonsDisplayed &&
        typeof window !== "undefined" &&
        !window.Touch &&
        window.console
    ) {
        console.warn("[Q] Unhandled rejection reasons (should be empty):",
                     unhandledReasons);
    }

    unhandledReasonsDisplayed = true;
}

function logUnhandledReasons() {
    for (var i = 0; i < unhandledReasons.length; i++) {
        var reason = unhandledReasons[i];
        console.warn("Unhandled rejection reason:", reason);
    }
}

function resetUnhandledRejections() {
    unhandledReasons.length = 0;
    unhandledRejections.length = 0;
    unhandledReasonsDisplayed = false;

    if (!trackUnhandledRejections) {
        trackUnhandledRejections = true;

        // Show unhandled rejection reasons if Node exits without handling an
        // outstanding rejection.  (Note that Browserify presently produces a
        // `process` global without the `EventEmitter` `on` method.)
        if (typeof process !== "undefined" && process.on) {
            process.on("exit", logUnhandledReasons);
        }
    }
}

function trackRejection(promise, reason) {
    if (!trackUnhandledRejections) {
        return;
    }

    unhandledRejections.push(promise);
    if (reason && typeof reason.stack !== "undefined") {
        unhandledReasons.push(reason.stack);
    } else {
        unhandledReasons.push("(no stack) " + reason);
    }
    displayUnhandledReasons();
}

function untrackRejection(promise) {
    if (!trackUnhandledRejections) {
        return;
    }

    var at = array_indexOf(unhandledRejections, promise);
    if (at !== -1) {
        unhandledRejections.splice(at, 1);
        unhandledReasons.splice(at, 1);
    }
}

Q.resetUnhandledRejections = resetUnhandledRejections;

Q.getUnhandledReasons = function () {
    // Make a copy so that consumers can't interfere with our internal state.
    return unhandledReasons.slice();
};

Q.stopUnhandledRejectionTracking = function () {
    resetUnhandledRejections();
    if (typeof process !== "undefined" && process.on) {
        process.removeListener("exit", logUnhandledReasons);
    }
    trackUnhandledRejections = false;
};

resetUnhandledRejections();

//// END UNHANDLED REJECTION TRACKING

/**
 * Constructs a rejected promise.
 * @param reason value describing the failure
 */
Q.reject = reject;
function reject(reason) {
    var rejection = Promise({
        "when": function (rejected) {
            // note that the error has been handled
            if (rejected) {
                untrackRejection(this);
            }
            return rejected ? rejected(reason) : this;
        }
    }, function fallback() {
        return this;
    }, function inspect() {
        return { state: "rejected", reason: reason };
    });

    // Note that the reason has not been handled.
    trackRejection(rejection, reason);

    return rejection;
}

/**
 * Constructs a fulfilled promise for an immediate reference.
 * @param value immediate reference
 */
Q.fulfill = fulfill;
function fulfill(value) {
    return Promise({
        "when": function () {
            return value;
        },
        "get": function (name) {
            return value[name];
        },
        "set": function (name, rhs) {
            value[name] = rhs;
        },
        "delete": function (name) {
            delete value[name];
        },
        "post": function (name, args) {
            // Mark Miller proposes that post with no name should apply a
            // promised function.
            if (name === null || name === void 0) {
                return value.apply(void 0, args);
            } else {
                return value[name].apply(value, args);
            }
        },
        "apply": function (thisp, args) {
            return value.apply(thisp, args);
        },
        "keys": function () {
            return object_keys(value);
        }
    }, void 0, function inspect() {
        return { state: "fulfilled", value: value };
    });
}

/**
 * Converts thenables to Q promises.
 * @param promise thenable promise
 * @returns a Q promise
 */
function coerce(promise) {
    var deferred = defer();
    nextTick(function () {
        try {
            promise.then(deferred.resolve, deferred.reject, deferred.notify);
        } catch (exception) {
            deferred.reject(exception);
        }
    });
    return deferred.promise;
}

/**
 * Annotates an object such that it will never be
 * transferred away from this process over any promise
 * communication channel.
 * @param object
 * @returns promise a wrapping of that object that
 * additionally responds to the "isDef" message
 * without a rejection.
 */
Q.master = master;
function master(object) {
    return Promise({
        "isDef": function () {}
    }, function fallback(op, args) {
        return dispatch(object, op, args);
    }, function () {
        return Q(object).inspect();
    });
}

/**
 * Spreads the values of a promised array of arguments into the
 * fulfillment callback.
 * @param fulfilled callback that receives variadic arguments from the
 * promised array
 * @param rejected callback that receives the exception if the promise
 * is rejected.
 * @returns a promise for the return value or thrown exception of
 * either callback.
 */
Q.spread = spread;
function spread(value, fulfilled, rejected) {
    return Q(value).spread(fulfilled, rejected);
}

Promise.prototype.spread = function (fulfilled, rejected) {
    return this.all().then(function (array) {
        return fulfilled.apply(void 0, array);
    }, rejected);
};

/**
 * The async function is a decorator for generator functions, turning
 * them into asynchronous generators.  Although generators are only part
 * of the newest ECMAScript 6 drafts, this code does not cause syntax
 * errors in older engines.  This code should continue to work and will
 * in fact improve over time as the language improves.
 *
 * ES6 generators are currently part of V8 version 3.19 with the
 * --harmony-generators runtime flag enabled.  SpiderMonkey has had them
 * for longer, but under an older Python-inspired form.  This function
 * works on both kinds of generators.
 *
 * Decorates a generator function such that:
 *  - it may yield promises
 *  - execution will continue when that promise is fulfilled
 *  - the value of the yield expression will be the fulfilled value
 *  - it returns a promise for the return value (when the generator
 *    stops iterating)
 *  - the decorated function returns a promise for the return value
 *    of the generator or the first rejected promise among those
 *    yielded.
 *  - if an error is thrown in the generator, it propagates through
 *    every following yield until it is caught, or until it escapes
 *    the generator function altogether, and is translated into a
 *    rejection for the promise returned by the decorated generator.
 */
Q.async = async;
function async(makeGenerator) {
    return function () {
        // when verb is "send", arg is a value
        // when verb is "throw", arg is an exception
        function continuer(verb, arg) {
            var result;
            if (hasES6Generators) {
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    return reject(exception);
                }
                if (result.done) {
                    return result.value;
                } else {
                    return when(result.value, callback, errback);
                }
            } else {
                // FIXME: Remove this case when SM does ES6 generators.
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    if (isStopIteration(exception)) {
                        return exception.value;
                    } else {
                        return reject(exception);
                    }
                }
                return when(result, callback, errback);
            }
        }
        var generator = makeGenerator.apply(this, arguments);
        var callback = continuer.bind(continuer, "next");
        var errback = continuer.bind(continuer, "throw");
        return callback();
    };
}

/**
 * The spawn function is a small wrapper around async that immediately
 * calls the generator and also ends the promise chain, so that any
 * unhandled errors are thrown instead of forwarded to the error
 * handler. This is useful because it's extremely common to run
 * generators at the top-level to work with libraries.
 */
Q.spawn = spawn;
function spawn(makeGenerator) {
    Q.done(Q.async(makeGenerator)());
}

// FIXME: Remove this interface once ES6 generators are in SpiderMonkey.
/**
 * Throws a ReturnValue exception to stop an asynchronous generator.
 *
 * This interface is a stop-gap measure to support generator return
 * values in older Firefox/SpiderMonkey.  In browsers that support ES6
 * generators like Chromium 29, just use "return" in your generator
 * functions.
 *
 * @param value the return value for the surrounding generator
 * @throws ReturnValue exception with the value.
 * @example
 * // ES6 style
 * Q.async(function* () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      return foo + bar;
 * })
 * // Older SpiderMonkey style
 * Q.async(function () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      Q.return(foo + bar);
 * })
 */
Q["return"] = _return;
function _return(value) {
    throw new QReturnValue(value);
}

/**
 * The promised function decorator ensures that any promise arguments
 * are settled and passed as values (`this` is also settled and passed
 * as a value).  It will also ensure that the result of a function is
 * always a promise.
 *
 * @example
 * var add = Q.promised(function (a, b) {
 *     return a + b;
 * });
 * add(Q(a), Q(B));
 *
 * @param {function} callback The function to decorate
 * @returns {function} a function that has been decorated.
 */
Q.promised = promised;
function promised(callback) {
    return function () {
        return spread([this, all(arguments)], function (self, args) {
            return callback.apply(self, args);
        });
    };
}

/**
 * sends a message to a value in a future turn
 * @param object* the recipient
 * @param op the name of the message operation, e.g., "when",
 * @param args further arguments to be forwarded to the operation
 * @returns result {Promise} a promise for the result of the operation
 */
Q.dispatch = dispatch;
function dispatch(object, op, args) {
    return Q(object).dispatch(op, args);
}

Promise.prototype.dispatch = function (op, args) {
    var self = this;
    var deferred = defer();
    nextTick(function () {
        self.promiseDispatch(deferred.resolve, op, args);
    });
    return deferred.promise;
};

/**
 * Gets the value of a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to get
 * @return promise for the property value
 */
Q.get = function (object, key) {
    return Q(object).dispatch("get", [key]);
};

Promise.prototype.get = function (key) {
    return this.dispatch("get", [key]);
};

/**
 * Sets the value of a property in a future turn.
 * @param object    promise or immediate reference for object object
 * @param name      name of property to set
 * @param value     new value of property
 * @return promise for the return value
 */
Q.set = function (object, key, value) {
    return Q(object).dispatch("set", [key, value]);
};

Promise.prototype.set = function (key, value) {
    return this.dispatch("set", [key, value]);
};

/**
 * Deletes a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to delete
 * @return promise for the return value
 */
Q.del = // XXX legacy
Q["delete"] = function (object, key) {
    return Q(object).dispatch("delete", [key]);
};

Promise.prototype.del = // XXX legacy
Promise.prototype["delete"] = function (key) {
    return this.dispatch("delete", [key]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param value     a value to post, typically an array of
 *                  invocation arguments for promises that
 *                  are ultimately backed with `resolve` values,
 *                  as opposed to those backed with URLs
 *                  wherein the posted value can be any
 *                  JSON serializable object.
 * @return promise for the return value
 */
// bound locally because it is used by other methods
Q.mapply = // XXX As proposed by "Redsandro"
Q.post = function (object, name, args) {
    return Q(object).dispatch("post", [name, args]);
};

Promise.prototype.mapply = // XXX As proposed by "Redsandro"
Promise.prototype.post = function (name, args) {
    return this.dispatch("post", [name, args]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param ...args   array of invocation arguments
 * @return promise for the return value
 */
Q.send = // XXX Mark Miller's proposed parlance
Q.mcall = // XXX As proposed by "Redsandro"
Q.invoke = function (object, name /*...args*/) {
    return Q(object).dispatch("post", [name, array_slice(arguments, 2)]);
};

Promise.prototype.send = // XXX Mark Miller's proposed parlance
Promise.prototype.mcall = // XXX As proposed by "Redsandro"
Promise.prototype.invoke = function (name /*...args*/) {
    return this.dispatch("post", [name, array_slice(arguments, 1)]);
};

/**
 * Applies the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param args      array of application arguments
 */
Q.fapply = function (object, args) {
    return Q(object).dispatch("apply", [void 0, args]);
};

Promise.prototype.fapply = function (args) {
    return this.dispatch("apply", [void 0, args]);
};

/**
 * Calls the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q["try"] =
Q.fcall = function (object /* ...args*/) {
    return Q(object).dispatch("apply", [void 0, array_slice(arguments, 1)]);
};

Promise.prototype.fcall = function (/*...args*/) {
    return this.dispatch("apply", [void 0, array_slice(arguments)]);
};

/**
 * Binds the promised function, transforming return values into a fulfilled
 * promise and thrown errors into a rejected one.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q.fbind = function (object /*...args*/) {
    var promise = Q(object);
    var args = array_slice(arguments, 1);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};
Promise.prototype.fbind = function (/*...args*/) {
    var promise = this;
    var args = array_slice(arguments);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};

/**
 * Requests the names of the owned properties of a promised
 * object in a future turn.
 * @param object    promise or immediate reference for target object
 * @return promise for the keys of the eventually settled object
 */
Q.keys = function (object) {
    return Q(object).dispatch("keys", []);
};

Promise.prototype.keys = function () {
    return this.dispatch("keys", []);
};

/**
 * Turns an array of promises into a promise for an array.  If any of
 * the promises gets rejected, the whole array is rejected immediately.
 * @param {Array*} an array (or promise for an array) of values (or
 * promises for values)
 * @returns a promise for an array of the corresponding values
 */
// By Mark Miller
// http://wiki.ecmascript.org/doku.php?id=strawman:concurrency&rev=1308776521#allfulfilled
Q.all = all;
function all(promises) {
    return when(promises, function (promises) {
        var countDown = 0;
        var deferred = defer();
        array_reduce(promises, function (undefined, promise, index) {
            var snapshot;
            if (
                isPromise(promise) &&
                (snapshot = promise.inspect()).state === "fulfilled"
            ) {
                promises[index] = snapshot.value;
            } else {
                ++countDown;
                when(
                    promise,
                    function (value) {
                        promises[index] = value;
                        if (--countDown === 0) {
                            deferred.resolve(promises);
                        }
                    },
                    deferred.reject,
                    function (progress) {
                        deferred.notify({ index: index, value: progress });
                    }
                );
            }
        }, void 0);
        if (countDown === 0) {
            deferred.resolve(promises);
        }
        return deferred.promise;
    });
}

Promise.prototype.all = function () {
    return all(this);
};

/**
 * Waits for all promises to be settled, either fulfilled or
 * rejected.  This is distinct from `all` since that would stop
 * waiting at the first rejection.  The promise returned by
 * `allResolved` will never be rejected.
 * @param promises a promise for an array (or an array) of promises
 * (or values)
 * @return a promise for an array of promises
 */
Q.allResolved = deprecate(allResolved, "allResolved", "allSettled");
function allResolved(promises) {
    return when(promises, function (promises) {
        promises = array_map(promises, Q);
        return when(all(array_map(promises, function (promise) {
            return when(promise, noop, noop);
        })), function () {
            return promises;
        });
    });
}

Promise.prototype.allResolved = function () {
    return allResolved(this);
};

/**
 * @see Promise#allSettled
 */
Q.allSettled = allSettled;
function allSettled(promises) {
    return Q(promises).allSettled();
}

/**
 * Turns an array of promises into a promise for an array of their states (as
 * returned by `inspect`) when they have all settled.
 * @param {Array[Any*]} values an array (or promise for an array) of values (or
 * promises for values)
 * @returns {Array[State]} an array of states for the respective values.
 */
Promise.prototype.allSettled = function () {
    return this.then(function (promises) {
        return all(array_map(promises, function (promise) {
            promise = Q(promise);
            function regardless() {
                return promise.inspect();
            }
            return promise.then(regardless, regardless);
        }));
    });
};

/**
 * Captures the failure of a promise, giving an oportunity to recover
 * with a callback.  If the given promise is fulfilled, the returned
 * promise is fulfilled.
 * @param {Any*} promise for something
 * @param {Function} callback to fulfill the returned promise if the
 * given promise is rejected
 * @returns a promise for the return value of the callback
 */
Q.fail = // XXX legacy
Q["catch"] = function (object, rejected) {
    return Q(object).then(void 0, rejected);
};

Promise.prototype.fail = // XXX legacy
Promise.prototype["catch"] = function (rejected) {
    return this.then(void 0, rejected);
};

/**
 * Attaches a listener that can respond to progress notifications from a
 * promise's originating deferred. This listener receives the exact arguments
 * passed to ``deferred.notify``.
 * @param {Any*} promise for something
 * @param {Function} callback to receive any progress notifications
 * @returns the given promise, unchanged
 */
Q.progress = progress;
function progress(object, progressed) {
    return Q(object).then(void 0, void 0, progressed);
}

Promise.prototype.progress = function (progressed) {
    return this.then(void 0, void 0, progressed);
};

/**
 * Provides an opportunity to observe the settling of a promise,
 * regardless of whether the promise is fulfilled or rejected.  Forwards
 * the resolution to the returned promise when the callback is done.
 * The callback can return a promise to defer completion.
 * @param {Any*} promise
 * @param {Function} callback to observe the resolution of the given
 * promise, takes no arguments.
 * @returns a promise for the resolution of the given promise when
 * ``fin`` is done.
 */
Q.fin = // XXX legacy
Q["finally"] = function (object, callback) {
    return Q(object)["finally"](callback);
};

Promise.prototype.fin = // XXX legacy
Promise.prototype["finally"] = function (callback) {
    callback = Q(callback);
    return this.then(function (value) {
        return callback.fcall().then(function () {
            return value;
        });
    }, function (reason) {
        // TODO attempt to recycle the rejection with "this".
        return callback.fcall().then(function () {
            throw reason;
        });
    });
};

/**
 * Terminates a chain of promises, forcing rejections to be
 * thrown as exceptions.
 * @param {Any*} promise at the end of a chain of promises
 * @returns nothing
 */
Q.done = function (object, fulfilled, rejected, progress) {
    return Q(object).done(fulfilled, rejected, progress);
};

Promise.prototype.done = function (fulfilled, rejected, progress) {
    var onUnhandledError = function (error) {
        // forward to a future turn so that ``when``
        // does not catch it and turn it into a rejection.
        nextTick(function () {
            makeStackTraceLong(error, promise);
            if (Q.onerror) {
                Q.onerror(error);
            } else {
                throw error;
            }
        });
    };

    // Avoid unnecessary `nextTick`ing via an unnecessary `when`.
    var promise = fulfilled || rejected || progress ?
        this.then(fulfilled, rejected, progress) :
        this;

    if (typeof process === "object" && process && process.domain) {
        onUnhandledError = process.domain.bind(onUnhandledError);
    }

    promise.then(void 0, onUnhandledError);
};

/**
 * Causes a promise to be rejected if it does not get fulfilled before
 * some milliseconds time out.
 * @param {Any*} promise
 * @param {Number} milliseconds timeout
 * @param {String} custom error message (optional)
 * @returns a promise for the resolution of the given promise if it is
 * fulfilled before the timeout, otherwise rejected.
 */
Q.timeout = function (object, ms, message) {
    return Q(object).timeout(ms, message);
};

Promise.prototype.timeout = function (ms, message) {
    var deferred = defer();
    var timeoutId = setTimeout(function () {
        deferred.reject(new Error(message || "Timed out after " + ms + " ms"));
    }, ms);

    this.then(function (value) {
        clearTimeout(timeoutId);
        deferred.resolve(value);
    }, function (exception) {
        clearTimeout(timeoutId);
        deferred.reject(exception);
    }, deferred.notify);

    return deferred.promise;
};

/**
 * Returns a promise for the given value (or promised value), some
 * milliseconds after it resolved. Passes rejections immediately.
 * @param {Any*} promise
 * @param {Number} milliseconds
 * @returns a promise for the resolution of the given promise after milliseconds
 * time has elapsed since the resolution of the given promise.
 * If the given promise rejects, that is passed immediately.
 */
Q.delay = function (object, timeout) {
    if (timeout === void 0) {
        timeout = object;
        object = void 0;
    }
    return Q(object).delay(timeout);
};

Promise.prototype.delay = function (timeout) {
    return this.then(function (value) {
        var deferred = defer();
        setTimeout(function () {
            deferred.resolve(value);
        }, timeout);
        return deferred.promise;
    });
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided as an array, and returns a promise.
 *
 *      Q.nfapply(FS.readFile, [__filename])
 *      .then(function (content) {
 *      })
 *
 */
Q.nfapply = function (callback, args) {
    return Q(callback).nfapply(args);
};

Promise.prototype.nfapply = function (args) {
    var deferred = defer();
    var nodeArgs = array_slice(args);
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided individually, and returns a promise.
 * @example
 * Q.nfcall(FS.readFile, __filename)
 * .then(function (content) {
 * })
 *
 */
Q.nfcall = function (callback /*...args*/) {
    var args = array_slice(arguments, 1);
    return Q(callback).nfapply(args);
};

Promise.prototype.nfcall = function (/*...args*/) {
    var nodeArgs = array_slice(arguments);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Wraps a NodeJS continuation passing function and returns an equivalent
 * version that returns a promise.
 * @example
 * Q.nfbind(FS.readFile, __filename)("utf-8")
 * .then(console.log)
 * .done()
 */
Q.nfbind =
Q.denodeify = function (callback /*...args*/) {
    var baseArgs = array_slice(arguments, 1);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        Q(callback).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nfbind =
Promise.prototype.denodeify = function (/*...args*/) {
    var args = array_slice(arguments);
    args.unshift(this);
    return Q.denodeify.apply(void 0, args);
};

Q.nbind = function (callback, thisp /*...args*/) {
    var baseArgs = array_slice(arguments, 2);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        function bound() {
            return callback.apply(thisp, arguments);
        }
        Q(bound).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nbind = function (/*thisp, ...args*/) {
    var args = array_slice(arguments, 0);
    args.unshift(this);
    return Q.nbind.apply(void 0, args);
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback with a given array of arguments, plus a provided callback.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param {Array} args arguments to pass to the method; the callback
 * will be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nmapply = // XXX As proposed by "Redsandro"
Q.npost = function (object, name, args) {
    return Q(object).npost(name, args);
};

Promise.prototype.nmapply = // XXX As proposed by "Redsandro"
Promise.prototype.npost = function (name, args) {
    var nodeArgs = array_slice(args || []);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback, forwarding the given variadic arguments, plus a provided
 * callback argument.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param ...args arguments to pass to the method; the callback will
 * be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nsend = // XXX Based on Mark Miller's proposed "send"
Q.nmcall = // XXX Based on "Redsandro's" proposal
Q.ninvoke = function (object, name /*...args*/) {
    var nodeArgs = array_slice(arguments, 2);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    Q(object).dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

Promise.prototype.nsend = // XXX Based on Mark Miller's proposed "send"
Promise.prototype.nmcall = // XXX Based on "Redsandro's" proposal
Promise.prototype.ninvoke = function (name /*...args*/) {
    var nodeArgs = array_slice(arguments, 1);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * If a function would like to support both Node continuation-passing-style and
 * promise-returning-style, it can end its internal promise chain with
 * `nodeify(nodeback)`, forwarding the optional nodeback argument.  If the user
 * elects to use a nodeback, the result will be sent there.  If they do not
 * pass a nodeback, they will receive the result promise.
 * @param object a result (or a promise for a result)
 * @param {Function} nodeback a Node.js-style callback
 * @returns either the promise or nothing
 */
Q.nodeify = nodeify;
function nodeify(object, nodeback) {
    return Q(object).nodeify(nodeback);
}

Promise.prototype.nodeify = function (nodeback) {
    if (nodeback) {
        this.then(function (value) {
            nextTick(function () {
                nodeback(null, value);
            });
        }, function (error) {
            nextTick(function () {
                nodeback(error);
            });
        });
    } else {
        return this;
    }
};

// All code before this point will be filtered from stack traces.
var qEndingLine = captureLine();

return Q;

});

}).call(this,require("/Users/jonathan/Projects/modelizer/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"))
},{"/Users/jonathan/Projects/modelizer/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":5}],"q":[function(require,module,exports){
module.exports=require('qLuPo1');
},{}]},{},["pZmObk"])