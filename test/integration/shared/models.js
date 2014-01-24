var model = require('../../../lib/model.js');

var Type = {
  "string" : "string",
  "int" : "int"
};

var AddressModel = new model("AdressModel")
  .attr("street", Type.string)
  .attr("number", Type.int)
;


var PersonModel = new model("Person")
  .attr("name", Type.string)
  .attr("eMail", Type.string)
  .attr("age", Type.int)
  .attrArray("address", AddressModel)
  .operation("resetPassword")
;


PersonModel.operationImpl("resetPassword", function() {
  console.log('reset Passwort Operation called!');
});



if (typeof window === 'undefined') {  // todo: conditional code (muss besser werden)
  module.exports = {
    AddressModel : AddressModel,
    PersonModel : PersonModel
  };
}
