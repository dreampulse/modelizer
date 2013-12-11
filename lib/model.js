
// todo: meta Modell erzuegen

var Model = function(modelName) {
  var self = this;

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



  // simuliert das verhalten einer referenz auf ein anderes Object
  // Zugriff dann mit object.ref.XXX
  this.reference = function(refModel) {
      var _reference = this;
      var _model = refModel;

      this.createObject = function() {
          this.ref = refModel.createObject();
          return this.ref;
      }

      this.setObject = function(obj) {
          this.ref = obj;
      }
  };

  this.createArrayElement = function(arrayModel, array) {
    return function() {
      var el = arrayModel.createObject(); // creates the new element
      delete el.save;  // hack :-(

      array.push(el); // add ne element to the array
    }
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

    this.reload = function() {};
    this.delete = function() {};
  };

  this.createObject = function() {
    var obj = new self.baseObj();  // das wird usere Modell-Instanz

    // create the attributes
    for(var i=0; i<self.attrs.length; i++) {
      obj[self.attrs[i].name] = undefined;
    }

    // create Attribute Objects (a sub structure)
    for(var i in self.attrObjs) {
      var attrObj = self.attrObjs[i].createObject();
      delete attrObj.save;  // hack :-(
      obj[i] = attrObj;
      // TODO: createObject funktionalität ohne baseobject
    }

    // create a reference to another model
    for(var i in self.attrRefs) {
      var modelRef = self.attrRefs[i];
      obj[i] = new self.reference(modelRef);

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

  // using of the model
  this.use = {
    all : function() {
      return applyReadFilters(self.objStore);
    }/*,
    get : function(id) {
      self.objStore[id];
      return applyReadFilters(function(){
        return self.objStore[id];
      });
    }*/
  };

  return this;
};

// all implementieren
// eigentlich ist model-def ein aspekt
// und von den aspekten gibts viele

module.exports = Model;
