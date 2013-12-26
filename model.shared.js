var model = require('./lib/model');

var Type = {
  "string" : "string",
  "int" : "int"
};

var AddressModel = new model("AdressModel")
    .attr("street", Type.string)
    .attr("number", Type.string)
;

var AmazonStoreModel = new model("AmazonStore")
    .virtualAttr("url", Type.string)
    .attr("fileSize", Type.int)
    .attr("fileName", Type.string)
    .operation("sign")  // Todo: attribute validation für operationen
  ;


var StammdatenModel = new model("Stammdaten")
    .attr("name", Type.string)
    .attr("eMail", Type.string)
    .attr("age", Type.int)
    .attrArray("address", AddressModel)
    .operation("resetPassword")

 //   .attrObj("file", AmazonStoreModel)
    .attrRef("store", AmazonStoreModel)
    .attrRefArray("participants", AddressModel) // TODO: problem bei selbstreferenzen (variable ist noch undefined)
                                                // verschwindet vlt beim entfernen von refModel.mongoDB
  ;

var PlanModel = new model("Plan")
    .attr("name", Type.string)
    .attrRef("owner", StammdatenModel)
    .attrRefArray("participants", StammdatenModel)
    .attrObj("file", AmazonStoreModel)
  ;


AmazonStoreModel.virtualAttrImpl("url", function(model) {
  return "http://" + model.fileName;
});


StammdatenModel.operationImpl("resetPassword", function() {
  console.log('fooo :-)');
});


StammdatenModel.readFilter(function () {
  return true;
});


//StammdatenModel.readFilter(function () {
//  return {userId : "foo"};
//});


var mongojs = require('mongojs');
var db = mongojs('mongodb://127.0.0.1/test');
StammdatenModel.mongoDB(db);

//StammdatenModel.mongoDB("foo");

module.exports = {
  AmazonStoreModel : AmazonStoreModel,
  StammdatenModel : StammdatenModel,
  PlanModel : PlanModel
};

// TODO: nächste Schritte:
// - model def einführen
// - attr type validation (Type.string) könnte ja immer ein Validator sein

// - mongo Implementierung
// - filter beim mongo store
// - tests für reference Arrays

// - überlegen wie das mit dem client Zugriff funktionieren soll
// - Aufräumen

// - der Client braucht ObjectId (steckt im bison modul)


// Aufräumen:
// - die Attribute eines Objects auch attr nennen!
// - generell eine Benahmung überlegen
