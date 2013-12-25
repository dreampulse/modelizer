var Q = require('q');

// todo: meta Modell erzuegen

function assert(condition, message) {
  if (!condition) {
    throw message || "Assertion failed";
  }
}

var Model = function(modelName) {
  var self = this;

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
  this.operations = {};
  this.operation = function(operationName) {
    this.operations[operationName] = operationName;

    return self;
  }

  this.operationImpls = {};
  this.operationImpl = function(operationName, fnImpl) {
    this.operationImpls[operationName] = fnImpl;

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


  // setup mongodb stuff
  this.mongoDB = function(db) {
    this.db = db;  // the mongo-database connector is now available with 'self.db'
    this.collection = db.collection(modelName);  // the collection for this model
  }




  // simuliert das verhalten einer referenz auf ein anderes Object
  // Zugriff dann mit object.ref().XXX
  this.reference = function(refModel) {
    refModel.mongoDB(self.db);  // mongodb connection an child modell durchreichen

    this.createObject = function() {
      var refObj = refModel.createObject();
      this.ref = function() { return refObj; }  // definition von der .ref()-Methode
      return this.ref;
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
        })
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

  // verhalten von Many-Referenzen
  this.referenceArray = function(refModel) {
    this.ref = [];
    refModel.mongoDB(self.db);  // mongodb connection an child modell durchreichen

    this.createObject = function() {
      var refObj = refModel.createObject();
      var ref = function() {return refObj; }
      this.ref.push(ref);
      return refObj;
    }
  }


  this.createArrayElement = function(arrayModel, array) {
    // Das hier ist die Funktion um ein neues Array Element anzulegen
    return function() {
      var el = arrayModel._initObject(); // creates the new element

      array.push(el); // add the element to the array
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
      var deferred = Q.defer();

      // Speichern (vorbereiten) von Referenz-Attributen
      for (var i in self.attrRefs) {
        if (obj[i].ref !== undefined && obj[i].ref()._id) {  // wenn das referenzierte Object existiert und bereits gespeichert wurde
          obj[i]._reference = obj[i].ref()._id;  // die reference id mit speichern
        }
      }

      // Speichern (vorbereiten) von Referenz-Arrays
      for (var i in self.attrRefArrays) {  // über alle Referenz Arrays die in meinem Modell vorkommen
        var refArray = obj[i];
        refArray._references = [];
        for (var j=0; j<refArray.ref.length; j++) {  // über die einzelnen Elemente dieses Arrays
          var ref = refArray.ref[j];
          if (ref !== undefined && ref()._id) {  // wenn das referenzierte Object existiert und bereits gespeichert wurde
            refArray._references.push(ref()._id);   // die reference id mit speichern
          }
        }
      }


      // Speichere das Object in der Datenbank
      self.collection.save(obj, function(err, doc) {
        if (err) return deferred.reject(err);
        if (doc !== 1) {  // doc is 1 if an insert was performed
          obj._id = doc._id;  // store the generated Mongo-ObjectId to the local context
        }
        return deferred.resolve(doc);
      });

      return deferred.promise;
    }

    obj.remove = function() {
      var deferred = Q.defer();

      if (obj._id === undefined) return deferred.reject(new Error("Object seems not to been saved so far!"));

      self.collection.remove({_id:obj._id}, true, function(err, result) {
        if (result === 1) {  // removed sucessfull
          delete obj._id;
          return deferred.resolve();
        }
        if (result === 0) return deferred.reject(new Error('No document with this id found!'));
        if (err) return deferred.reject(new Error('Failed to remove document!'));
      });

      return deferred.promise;
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
      var modelRef = self.attrRefArrays[i];
      obj[i] = new self.referenceArray(modelRef);

    }

    // create the operations
    for(var i in self.operations) {
      obj[i] = self.operationImpls[i];
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
      arrayName = arrayName[0].toUpperCase() + arrayName.substr(1)
      obj["create" + arrayName + "Element"] = this.createArrayElement(self.attrArrays[i], obj[i]);
    }

    return obj;
  }


  // setup filters for using the model
  this.readFilters = [];
  this.readFilter = function(fn) {
    this.readFilters.push(fn);
  }

  // applies the read filter to all objs and returns the filtered result
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

  // Using the model (static functions)

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

    // TODO: kopieren von anderen Methoden die durch das kopieren oben überschrieben werden


    return obj;
  };

  // using of the model with mongo db
  this.use = {
    get : function(id) {
      var deferred = Q.defer();

      self.collection.findOne({_id:id}, function(err, doc) {
        if (err) return deferred.reject(err);
        if (doc === null) return deferred.reject(new Error("Object not found!"));

        var obj = self.loadFromDoc(doc);
        deferred.resolve(obj);
      });

      return deferred.promise;
    },

    find : function(search) {
      var deferred = Q.defer();

      // todo using filters
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
    }
  };


  return this;
};

// all implementieren
// eigentlich ist model-def ein aspekt
// und von den aspekten gibts viele

module.exports = Model;
