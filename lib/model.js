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