var Type = function () {}

// Todo (maybe): MetaMetaModell : adds für attrs und checker für attrs (type checking)


var Model = function(modelName) {

  this.attr = function(attrName, attrType) {
    this[attrName] = undefined;
  };

  this.operation = function(operationName) {
    this[operationName] = function() {
      throw new Error("Not Implemented!");
    }
  }

  this.virtualAttr = function(attrName, attrType) {
    this[attrName] = undefined;
  }

  this.operationImpl = function(operationName, fnImpl) {
    this[operationName] = fnImpl;
  }

  return this;
};




var AmazonStoreModel = new Model("AmazonStore")
    .virtualAttr("url", Type.string)
    .attr("fileSize", Type.int)
    .attr("fileName", Type.string)
    .operation("sign")  // Todo: attribute validation
  ;


var StammdatenModel = new Model("Stammdaten")
    .attr("userId", Type.id)
    .attr("name", Type.string)
    .attr("eMail", Type.string)
    .attr("age", Type.int)
    .operation("resetPassword")
  ;

var PlanModel = new Model("Plan")
    .attr("name", Type.string)
    .attr("owner", Type.ref, StammdatenModel)
    .attr("file", Type.object, "AmazonStore")
  ;

// todo: (objekte als Attribute) -> sind inlineModelle
// todo: Listen uns Hashes


// export
// models([StammdatenModel]);


// andere Datei

StammdatenModel.readFilter(function (model, user) {
  return { "userId" : user.userId};
});

StammdatenModel.writeFilter(function(model, user) {
  return user == model.userId
});




StammdatenModel.operationImpl("resetPassword", function(model, user) {

});

