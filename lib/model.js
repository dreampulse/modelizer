
// todo: meta Modell erzuegen

var Model = function(modelName) {
  var self = this;

  this.attrs = [];
  this.attr = function(attrName, attrType) {
    this.attrs.push({name : attrName, type : attrType});

    return self;
  };

  // a reference to another model
  this.attrRefs = [];
  this.attrRef = function(attrName, reference) {
    this.attrRefs.push({name : attrName, ref: reference});
    this[attrName] = reference;

    return self;
  };

  // a reference to another model
  this.attrObjs = [];
  this.attrObj = function(attrName, obj) {
    this.attrObjs.push({name : attrName, obj: obj});
    this[attrName] = obj;

    return self;
  };


  // an inline object
  this.operations = {};
  this.operation = function(operationName) {
    this.operations[operationName] = operationName;

    return self;
  }

  this.virtualAttr = function(attrName, attrType) {
    this[attrName] = undefined;

    return self;
  }

  this.operationImpls = {};
  this.operationImpl = function(operationName, fnImpl) {
    this.operationImpls[operationName] = fnImpl;

    return self;
  }


  /// Creating a new empty Object

  this.objStore = {};   // speicher mit allen objekten
  // def was ich alles mit dem obj tun kann
  this.baseObj = function() {
    var _context = this;

    this.save = function() {
      if (_context._id == undefined) { // damit beim mehrmaligen aufruf von save immer in den selben hash gespeichert wird
        _context._id = Math.floor((Math.random()*1000000000));
      }

      self.objStore[_context._id] = _context;

    }
  };

  this.createObject = function() {
    var obj = new self.baseObj();

    for(var i=0; i<self.attrs.length; i++) {
      obj[self.attrs[i].name] = undefined;
    }

    for(var i in self.operations) {
      obj[i] = self.operationImpls[i];
    }

    return obj;
  }

  // setup filters for using the model
  this.readFilters = [];
  this.readFilter = function(fn) {
    this.readFilters.push(fn);
  }

  var applyReadFilters = function(fn) {
    for (var i=0; i<self.readFilters.length; i++) {
       if (!self.readFilters[i]()) return false;
    }

    return fn(); // only apply read function if all filters passed
  }

  // Using the model (static functions)

  // using of the model
  this.use = {
    all : function() {
      return applyReadFilters(function(){ // wenn der filter erfolgreich war
        return self.objStore;             // wird das hier ausgeführt
      });
    }
  };

  return this;
};

// all implementieren
// eigentlich ist model-def ein aspekt
// und von den aspekten gibts viele

module.exports = Model;
