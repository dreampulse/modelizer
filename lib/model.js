
// todo: meta Modell erzuegen

var Model = function(modelName) {
  this._attrStore = [];
  this._operationStore = [];

  this.attr = function(attrName, attrType) {
    this._attrStore.push({name: attrName, type : attrType});
    this[attrName] = undefined;
  };

  this.operation = function(operationName) {
    this[operationName] = function() {
      this._operationStore.push({name:operationName});
      throw new Error("Not Implemented!");
    }
  }

  this.virtualAttr = function(attrName, attrType) {
    this[attrName] = undefined;
  }

  this.operationImpl = function(operationName, fnImpl) {
    this[operationName] = fnImpl;
  }

  this.inject = function(fn) {
    fn(this);
  }

  return this;
};


modules.export = Model;