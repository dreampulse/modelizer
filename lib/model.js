// todo: meta Modell erzuegen

////// Micro libs ////

function assert(condition, message) {
  if (!condition) {
    throw message || "Assertion failed";
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
  // asume running in node enviroment
  var Q = require('q');
} else {
  // asume running in browser enviroment
  assert(Q !== undefined, 'Missing Q in the enviroment');
}



var Model = function(modelName) {
  var self = this;

  this.modelName = modelName;

  // im scope der Model-Methode speichere ich alles was ich dem Modell übergeben kann
  // also Attribute, operationen usw..
  // die Funktionen hierfür sehen eigentlich immer gleich auch
  // deswegen sollte das auch in ein meta-modell wandern

  this.attrs = [];   // TODO: so machen wie den Rest
  this.attr = function(attrName, attrType) {
    this.attrs.push({name : attrName, type : attrType});

    return self;
  };

  // a reference to another model
  this.attrRefs = {};
  this.attrRef = function(attrName, reference) {
    this.attrRefs[attrName] = reference;

    return self;
  };

  // a reference to another model
  this.attrObjs = {};
  this.attrObj = function(attrName, obj) {
    this.attrObjs[attrName] = obj;

    return self;
  };


  // an inline object
  this.methods = {};
  this.method = function(methodName) {
    this.methods[methodName] = methodName;

    return self;
  }

  this.methodImpls = {};
  this.methodImpl = function(methodName, fnImpl) {
    this.methodImpls[methodName] = fnImpl;

    return self;
  }

  this.virtualAttrs = {};
  this.virtualAttr = function(attrName, attrType) {
    this.virtualAttrs[attrName] = {name : attrName, type : attrType};

    return self;
  }

  this.virtualAttrImpls = {};
  this.virtualAttrImpl = function(virtualAttrName, fnImpl) {
    this.virtualAttrImpls[virtualAttrName] = fnImpl;

    return self;
  }

  this.attrArrays = {};
  this.attrArray = function(attrName, obj) {
    this.attrArrays[attrName] = obj;

    return self;
  }

  this.attrRefArrays = {};
  this.attrRefArray = function(attrName, obj) {
    this.attrRefArrays[attrName] = obj;

    return self;
  }


  this.operations = {};
  this.operation = function(operationName) {
    this.operations[operationName] = operationName;

    this[operationName] = function(params) {
      assert(this.collection != undefined, "Use a connectior!");
      return this.use.callOp(operationName, params, null);
    }

    return self;
  }

  this.operationImpls = {};
  this.operationImpl = function(operationName, fnImpl) {
    this.operationImpls[operationName] = fnImpl;

    return self;
  }

  // setup connection stuff
  this.connection = function(connector) {
    self.connector = connector;
    self.collection = connector(self);
  }


  // setup webserver stuff
  this.express = function(app) {
    this.app = app;
  }


  // der express teil :-)
  this.serve = function() {

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

    /*
     * Security Issue
     * transform ObjectID!!

    // REST - GET find
    this.app.get('/' + modelName + '/', function(req, res){
      assert(req.body != undefined, "request body missing! Use bodyParser!");

      res.setHeader('Content-Type', 'application/json');
      self.useFiltered.find(req.body)
        .then(function(docs) {
          res.send(JSON.stringify(docs, null, 2));
        })
        .fail(function (err) {
          res.send(500, {error: err.message} );
        }).done();
    });
    */

    // REST - GET all
    this.app.get('/' + modelName + '/all', function(req, res){

      res.setHeader('Content-Type', 'application/json');
      self.useFiltered.all()
        .then(function(docs) {
          res.send(JSON.stringify(docs, null, 2));
        })
        .fail(function (err) {
          res.send(500, {error: err.message} );
        }).done();
    });

    // REST - GET id
    this.app.get('/' + modelName + '/:id', function(req, res) {
      res.setHeader('Content-Type', 'application/json');
      self.useFiltered.get(req.params.id)
        .then(function(doc) {
          res.send(JSON.stringify(doc, null, 2));
        })
        .fail(function (err) {
          res.send(500, {error: err.message} );
        }).done();
    });

    // REST - save doc
    this.app.put('/' + modelName, function(req, res) {
      assert(req.body != undefined, "request body missing! Use bodyParser!");

      res.setHeader('Content-Type', 'application/json');

      // client sendet obj._id als string ->  in ObjectId umwandeln
      if (req.body._id != undefined) {
        var ObjectId = require('mongojs').ObjectId;
        try {
          req.body._id = ObjectId(req.body._id);
        } catch (e) {
          res.send(500, {error: "Invalid ObjectId Format"} );
          return;
        }
      }

      self.useFiltered.save(req.body)
        .then(function(doc) {
          res.send(JSON.stringify(doc, null, 2));
        })
        .fail(function (err) {
          res.send(500, {error: err.message} );
        }).done();
    });

    // REST - remove doc
    this.app.del('/' + modelName + '/:id', function(req, res) {
      res.setHeader('Content-Type', 'application/json');
      self.useFiltered.remove(req.params.id)
        .then(function() {
          res.send(200);
        })
        .fail(function (err) {
          res.send(500, {error: err.message} );
        }).done();
    });


    // REST - PUT operation
    this.app.put('/' + modelName + '/:op', function(req, res) {
      res.setHeader('Content-Type', 'application/json');
      self.useFiltered.callOp(req.params.op, req.body, req)
        .then(function(result) {
          res.send(200, result);
        })
        .fail(function (err) {
          res.send(500, {error: err.message} );
        }).done();

    });

  }


  // simuliert das verhalten einer referenz auf ein anderes Object
  // Zugriff dann mit object.ref().XXX
  this.reference = function(refModel) {
    refModel.connection(self.connector);  // mongodb connection an child modell durchreichen

    this.createObject = function() {
      var refObj = refModel.createObject();
      this.ref = function() { return refObj; }  // definition von der .ref()-Methode
      return this.ref();
    }

    // load object
    this.load = function() {
      var loadScope = this;

      var deferred = Q.defer();
      if (this._reference === undefined) {
        deferred.reject(new Error("Reference not set! Don't now what to load!"));
        return deferred.promise;
      }

      return refModel.use.get(this._reference)
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
  this.arrayReference = function(refModel) {
    refModel.connection(self.connector);  // mongodb connection an child modell durchreichen

    this.load = function() {   //TODO: ist ja genau das selbe Load wie beim reference!!
      var loadScope = this;

      var deferred = Q.defer();
      if (this._reference === undefined) {
        deferred.reject(new Error("Reference not set! Don't now what to load!"));
        return deferred.promise;
      }

      return refModel.use.get(this._reference)
        .then(function(obj) {
          var refObj = obj;
          loadScope.ref = function() { return refObj; }  // definition von der .ref()-Methode
          return refObj;
        });
    };

    this.ref = function() { throw new Error("Load Object first!");}

  };

  // verhalten von Many-Referenzen (erstellen eines neuen objects)
  this.createArrayReferenceElement = function(refModel, array) {
    // Das hier ist die Funktion die ein neue Array-Reference anlegt
    return function() {
      var refObj = refModel.createObject();

      // Das Reference Array Element zusammen bauen
      var el = new self.arrayReference(refModel);
      el.ref = function() { return refObj; };

      array.push(el);

      return el.ref();
    }
  }


  this.createArrayElement = function(arrayModel, array) {
    // Das hier ist die Funktion um ein neues Array Element anzulegen
    return function() {
      var el = arrayModel._initObject(); // creates the new element

      array.push(el); // add the element to the array

      return el;
    }
  }


  /// Erstellt alles was für den Datenbankzugriff benötigt wird

  //this.objStore = {};   // speicher mit allen objekten
  // def was ich alles mit dem obj tun kann
  this._addMongoStore = function(obj) {

//    this.save = function() {
//      if (_context._id == undefined) { // damit beim mehrmaligen aufruf von save immer in den selben hash gespeichert wird
//        _context._id = Math.floor((Math.random()*1000000000));
//      }
//
//      self.objStore[_context._id] = _context;
//
//    }
//
//    this.reload = function() {};
//    this.delete = function() {};

    // save to mongo db
    obj.save = function() {
  
      // Speichern (vorbereiten) von Referenz-Attributen
      for (var i in self.attrRefs) {
        if (obj[i].ref !== undefined && obj[i].ref()._id !== undefined) {  // wenn das referenzierte Object existiert und bereits gespeichert wurde
          obj[i]._reference = obj[i].ref()._id;  // die reference id mit speichern
        }
      }

      // Speichern (vorbereiten) von Referenz-Arrays
      for (var i in self.attrRefArrays) {  // über alle Referenz Arrays die in meinem Modell vorkommen
        var refArray = obj[i];
        for (var j=0; j<refArray.length; j++) {  // über die einzelnen Elemente dieses Arrays
          var ref = refArray[j];
          if (ref !== undefined && ref.ref()._id !== undefined) {  // wenn das referenzierte Object existiert und bereits gespeichert wurde
            ref._reference = ref.ref()._id;   // die reference id mit speichern
          }
        }
      }
      // Speichere das Object in der Datenbank
      return self.use.save(obj)
        .then(function(doc) {
          // Achtung: client gibt hier ein string zurück
          if (doc != 1) {  // doc is 1 if an insert was performed
            obj._id = doc._id;  // store the generated Mongo-ObjectId to the local context
          }
          var deferred = Q.defer();
          deferred.resolve(doc);
          return deferred.promise;
        });
    }

    obj.remove = function() {
      var deferred = Q.defer();

      if (obj._id === undefined) {
        deferred.reject(new Error("Object seems not to been saved so far!"));
        return deferred.promise;
      }

      return self.use.remove(obj._id)
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

    return obj;
  };


  // Erstellt ein neues Object aus dem Modell
  this.createObject = function() {
    var obj = this._initObject();
    obj = this._addMongoStore(obj);
    return obj;
  };

  // Diese Funktion fügt alles aus dem Modell in ein neues Object hinzu
  this._initObject = function() {
    var obj = new Object();  // das wird usere Modell-Instanz

    // create the attributes
    for(var i=0; i<self.attrs.length; i++) {
      obj[self.attrs[i].name] = undefined;
    }

    // create Attribute Objects (a sub structure)
    for(var i in self.attrObjs) {
      var attrObj = self.attrObjs[i]._initObject();
      obj[i] = attrObj;
    }

    // create a reference to another model
    for(var i in self.attrRefs) {
      var modelRef = self.attrRefs[i];
      obj[i] = new self.reference(modelRef);

    }

    // create a reference Array to another model
    for(var i in self.attrRefArrays) {
      var modelRef = self.attrRefArrays[i];  // Das Model auf das referenziert wird
      var arrayName = i;

      obj[i] = [];  // init with empty array

      arrayName = arrayName[0].toUpperCase() + arrayName.substr(1);
      obj["create" + arrayName + "Object"] = this.createArrayReferenceElement(modelRef, obj[i]);
    }

    // create the methods
    for(var i in self.methods) {
    //  obj[i] = function() {
    //    return self.use.callMethod(i, arguments);
    //  }
      obj[i] = self.methodImpls[i];
    }

    // create the virtualAttrs
    for (var i in self.virtualAttrs) {
      obj[i] = self.virtualAttrImpls[i](obj);
    }
    // TODO: es ist unklar wann am besten der Wert für ein virtueles Attribut brechnet wird

    // create stuff for attrArrays
    for (var i in self.attrArrays) {
      obj[i] = [];

      var arrayName = i;
      arrayName = arrayName[0].toUpperCase() + arrayName.substr(1);
      obj["create" + arrayName + "Element"] = this.createArrayElement(self.attrArrays[i], obj[i]);
    }

    return obj;
  }


  // setup filters for using the model
  this.readFilters = [];
  this.readFilter = function(fn) {
    this.readFilters.push(fn);
  }

  // create the filter hash (mongo search string)
  this._getReadFilter = function() {
    var res = {};
    for (var i=0; i<self.readFilters.length; i++) {  // alle filter
      var filter = self.readFilters[i]();
      if (filter === false) return false;  // deny all filter
      if (filter === true) continue;  // ignore filter

      // copy content
      for (var j in filter) {
        res[j] = filter[j];
      }
    }
    return res;
  }


  // setup write filters for using the model
  this.writeFilters = [];
  this.writeFilter = function(fn) {
    this.writeFilters.push(fn);
  }

  // create the filter hash (mongo search string)
  this._getWriteFilter = function() {
    var res = {};
    for (var i=0; i<self.writeFilters.length; i++) {  // alle filter
      var filter = self.writeFilters[i]();
      if (filter === false) return false;  // deny all filter
      if (filter === true) continue;  // ignore filter

      // copy content
      for (var j in filter) {
        res[j] = filter[j];
      }
    }
    return res;
  }




  /*  // applies the read filter to all objs and returns the filtered result
    var applyReadFilters = function(objs) {
      var objPassFilter = function(obj, filter) {  // return wether the object passes the filter
        if (typeof filter === 'boolean') return filter;

        for (var i in filter) { // uses all rules in the filter
          if (obj[i] !== filter[i]) {  // the value of the object has to match the filter value (like mongo filter syntax)
            return false;  // object failed to pass the filter
          }
        }
        return true; // filter has passed the filter
      }

      var objPassAllFilters = function(obj, filters) { // return wether the object passes all filters
        for (var i=0; i<filters.length; i++) {  // use all filters
          var filter = filters[i]();
          if (!objPassFilter(obj, filter)) return false;
        }
        return true;  // obj has passed all filters
      }

      var res = [];

      for (var id in objs) { // seq search through all obj in the store
        var obj = objs[id];

        if (objPassAllFilters(obj, self.readFilters)) {
          res.push(obj); // put the object in result set
        }
      }

      return res;
    }
  */
  // Using the model (static functions)

  this.loadFromDoc = function(doc) {
    var obj = self.createObject();

    // TODO: das hier überschreibt ja alle Methoden
    // da muss ich mir was besseres überlegen

    for (var j in doc) {
      obj[j] = doc[j];
    }

    // TODO: hier kopierere ich teilweise _initObject verhalten (-> kapseln )

    // hier kümmere ich mich um die Referenzen
    for(var j in self.attrRefs) {
      var modelRef = self.attrRefs[j];
      var ref_id = obj[j]._reference;
      obj[j] = new self.reference(modelRef);
      obj[j]._reference = ref_id;
    }

    // hier kümmere ich mich um Referenz-Arrays
    for(var j in self.attrRefArrays) {
      var modelRef = self.attrRefArrays[j];
      var refArray = obj[j];

      assert(typeof refArray.length === 'number');
      for (var k=0; k<refArray.length; k++) {
        var ref = refArray[k];
        var ref_id = ref._reference;   // _reference retten
        obj[j][k] = new self.arrayReference(modelRef);
        obj[j][k]._reference = ref_id;       // zurück speichern
      }
    }

      // TODO: kopieren von anderen Methoden die durch das kopieren oben überschrieben werden


    return obj;
  };


//  // using of the model
//  this.use = {
//    all : function() {
//      return applyReadFilters(self.objStore);
//    }/*,
//    get : function(id) {
//      self.objStore[id];
//      return applyReadFilters(function(){
//        return self.objStore[id];
//      });
//    }*/
//  };


  this.useFiltered = {
    // use default get
    get : function(id_str) {
      var ObjectId = require('mongojs').ObjectId;
      var id;

      try {
        id = ObjectId(id_str);
      } catch (e) {
        var deferred = Q.defer();
        deferred.reject(new Error("Invalid ObjectId Format"));
        return deferred.promise;
      }

      return self.useFiltered.find({_id:id})
        .then(function (docs) {
          if (docs.length != 1) {
            var deferred = Q.defer();
            deferred.reject(new Error("Object not found!"));
            return deferred.promise;
          }

          return docs[0];
        });
    },

    find : function(search) {
      var filter = self._getReadFilter();

      if (filter === false) {  // deny all
        var deferred = Q.defer();
        deferred.reject(new Error("Access denyed!"));
        return deferred.promise;
      }

      // copy
      for (var i in filter) {  // erweitere die Suche um den filter
        search[i] = filter[i];
        // Achtung: security! Suche muss mit Filterkriterien überschrieben werden!!
      }

      // weiterrichen an die eigentliche Suche
      //console.log(search);
      return self.use.find(search);
    },

    all : function() {
      return self.useFiltered.find({});
    },

    // write filter wurde bissher nicht getestet
    save : function(obj) {
      var filter = self._getWriteFilter();

      if (filter === false) {  // deny all
        var deferred = Q.defer();
        deferred.reject(new Error("Access denyed!"));
        return deferred.promise;
      }

      // TODO: der Filter muss irgendwie angewand werden -> da braucht es noch ein Konzept
//      // copy
//      for (var i in filter) {  // erweitere die Suche um den filter
//        search[i] = filter[i];
//        // Achtung: security! Suche muss mit Filterkriterien überschrieben werden!!
//      }


      // weiterrichen an den Aufruf
      return self.use.save(obj);

    },

    remove : function(id_str) {
      var ObjectId = require('mongojs').ObjectId;
      var id;
      try {
        id = ObjectId(id_str);
      } catch (e) {
        var deferred = Q.defer();
        deferred.reject(new Error("Invalid ObjectId Format"));
        return deferred.promise;
      }

      var filter = self._getWriteFilter();

      if (filter === false) {  // deny all
        var deferred = Q.defer();
        deferred.reject(new Error("Access denyed!"));
        return deferred.promise;
      }

      // weiterrichen an den Aufruf
      return self.use.remove(id);
    },

    callOp : function(operationName, params, HTMLrequest) {
      // todo security
      // todo: assure that operationName is in this.operations (security)
      return self.use.callOp(operationName, params, HTMLrequest);
    }


  };

  // using of the model with mongo db
  this.use = {
    get : function(id) {
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

        var obj = self.loadFromDoc(doc);
        deferred.resolve(obj);
      });

      return deferred.promise;
    },

    find : function(search) {
      var deferred = Q.defer();

      self.collection.find(search, function(err, docs) {
        if (err) return deferred.reject(err);
        var objs = [];

        // für jedes document in der DB ein object anlegen
        for (var i=0; i<docs.length; i++) {
          var doc = docs[i];
          var obj = self.loadFromDoc(doc);

          objs.push(obj);
        }
        deferred.resolve(objs);
      });

      return deferred.promise;
    },

    all : function() {
      return self.use.find({});
    },

    save : function(obj) {
      var deferred = Q.defer();

      self.collection.save(obj, function(err, doc) {
        if (err) {
          deferred.reject(err);
          return;
        }
        deferred.resolve(doc);
      });

      return deferred.promise;
    },

    remove : function(id) {
      var deferred = Q.defer();
      self.collection.remove({_id:id}, true, function(err, result) {
        if (result == "OK") {  // success from a client call
          deferred.resolve();
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
        if (err) {
          deferred.reject(new Error('Failed to remove document!'));
          return;
        }

        deferred.reject(new Error("Don't know what was the result of removing the object"));
        return;
      });

      return deferred.promise;
    },

    callOp : function(operationName, params, HTMLrequest) {
      return self.collection.callOperation(operationName, params, HTMLrequest);
    }

  };


  return this;
};



// "Subclasses"

// The Storage-System using Mongo-DB
Model.MongoConnector = function(databaseConnection) {
  var db = databaseConnection;

  return function(theModel) {
    var collection = db.collection(theModel.modelName);

    // extensions for operation call
    collection.callOperation = function(opName, params, HTMLrequest) {
      var deferred = Q.defer();
      var res = theModel.operationImpls[opName](params, HTMLrequest);
      if (res != undefined && res.name == 'promise') return res;  // if the function already returns a promise
      deferred.resolve(res);
      return deferred.promise;
    }
    
    return collection;  // the collection for this model
  }
}


// Using the REST-Interface
Model.AngularConnector = function(connectionUrl) {
  assert(angular !== undefined, "AngularJS has to be loaded!");

  var $http = angular.injector(['ng']).get('$http');

  // ajax Call to the server backend
  var ajaxCall = function(method, url, data, callback) {

    $http({method:method, url:url, data:data, withCredentials: true})
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
        if (status == 500 && data.hasOwnProperty("error")) {
          callback(new Error(data.error), null);
        } else {
          callback(new Error("Error in $http-request"), null);
        }
      });
  }

  return function(theModel) {
    return {
      find : function(search, callback) {
        assert(isEmptyObject(search), "Only all() implemented so far");
        ajaxCall('GET', connectionUrl + theModel.modelName + '/all', undefined, callback);
      },
      findOne : function(search, callback) {
        assert(search.hasOwnProperty("_id"), "Only searching for id implemented so far");
        ajaxCall('GET', connectionUrl + theModel.modelName + '/' + search._id, undefined, callback);
      },
      save : function(obj, callback) {
        ajaxCall('PUT', connectionUrl + theModel.modelName + '/', obj, callback);
      },
      remove : function(id, ignored, callback) {
        ajaxCall('DELETE', connectionUrl + theModel.modelName + '/' + id._id, undefined, callback);
      },
      callOperation : function(opName, params, HTMLrequest) {
        var deferred = Q.defer();
        ajaxCall('PUT', connectionUrl + theModel.modelName + '/' + opName, params, function(err, result) {
          if (err) deferred.reject(err);
          else deferred.resolve(result);
        });

        return deferred.promise;
      }
    }
  }
}



// all implementieren
// eigentlich ist model-def ein aspekt
// und von den aspekten gibts viele

if (typeof window === 'undefined') {
  module.exports = Model;
} else {
  window.require = function(content) {
    if (content.indexOf('lib/model') != -1) return Model;
  }
}
