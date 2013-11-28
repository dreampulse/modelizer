
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


  this.objStore = [];   // speicher mit allen objekten
  // def was ich alles mit dem obj tun kann



  this.createObject = function() {
    var obj = new Object();

    obj.save = function() {
      self.objStore.push(obj);
    }

    for(var i=0; i<self.attrs.length; i++) {
      obj[self.attrs[i].name] = undefined;
    }

    for(var i in self.operations) {
      obj[i] = self.operationImpls[i];
    }

    return obj;
  }

  // using of the model
  this.use = {
    all : function() {
      return self.objStore;
    }
  };

  return this;
};

// all implementieren
// eigentlich ist model-def ein aspekt
// und von den aspekten gibts viele

module.exports = Model;
