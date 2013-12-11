var model = require('./lib/model');

var Type = {
  "string" : "string",
  "int" : "int"
};

var AddressModel = new model("AdressModel")
    .attr("street", Type.string)
    .attr("number", Type.string)
;

var AmazonStoreModel = new model("AmazonStore"
  ).virtualAttr("url", Type.string
  ).attr("fileSize", Type.int
  ).attr("fileName", Type.string
  ).operation("sign")  // Todo: attribute validation
  ;


var StammdatenModel = new model("Stammdaten")
    .attr("userId", Type.id)
    .attr("name", Type.string)
    .attr("eMail", Type.string)
    .attr("age", Type.int)
    .attrArray("address", AddressModel)
    .operation("resetPassword")
  ;

var PlanModel = new model("Plan")
    .attr("name", Type.string)
    .attrRef("owner", StammdatenModel)
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


module.exports = {
  AmazonStoreModel : AmazonStoreModel,
  StammdatenModel : StammdatenModel,
  PlanModel : PlanModel
};

// TODO: nächste Schritte:
// - model def einführen
// - attr type validation (Type.string) könnte ja immer ein Validator sein
// - arrays (von referenzen)