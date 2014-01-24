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

// TODO: funktionier irgendwie nicht :-(
 //   .attrObj("file", AmazonStoreModel)
//    .attrRef("store", AmazonStoreModel)
//    .attrRefArray("participants", AddressModel) // TODO: problem bei selbstreferenzen (variable ist noch undefined)
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



if (typeof window === 'undefined') {  // todo: conditional code (muss besser werden)
  module.exports = {
    AmazonStoreModel : AmazonStoreModel,
    StammdatenModel : StammdatenModel,
    PlanModel : PlanModel
  };
}


// TODO: nächste Schritte:
// eine Unterscheidung Programmieren ob die lib auf dem Server oder Client läuft
//   - Eine Klasse programmieren, die -> DONE! :-)
//     findOne, find, save und remove anbietet (überall wo "self.collection" verwendet wird)
//   - Ein ajax-client Programmieren

// - get verwendet string anstatt ObjectID (soll)
// - überprüfen, wo überall ein string anstatt einer objectid verwendet wird
// - Ein loading konzept überlegen (von lodash abschauen)


// - model def einführen
// - attr type validation (Type.string) könnte ja immer ein Validator sein

// - mongo Implementierung
// - express für get id

// - überlegen wie das mit dem client Zugriff funktionieren soll
// - Aufräumen

// - der Client braucht ObjectId (steckt im bison modul)


// Aufräumen:
// - die Attribute eines Objects auch attr nennen!
// - generell eine Benahmung überlegen

