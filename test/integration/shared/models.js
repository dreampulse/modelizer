var model = require('../../../lib/model.js');

var Type = {
  "string" : "string",
  "int" : "int"
};

var AddressModel = new model("AdressModel")
  .attr("street", Type.string)
  .attr("number", Type.int)
;

var PersonalSettingModel = new model("PersonalSetting")
  .attr("storageSize", Type.int)
  .attr("password", Type.string)
  .attr('enabled', Type.string)
;

var PersonModel = new model("Person")
  .attr("name", Type.string)
  .attr("eMail", Type.string)
  .attr("age", Type.int)
  .attrArray("address", AddressModel)
  .attrObj("settings", PersonalSettingModel)
  .operation("resetPassword")
;


PersonModel.operationImpl("resetPassword", function() {
  console.log('reset password Operation called!');
});



if (typeof window === 'undefined') {  // todo: conditional code (muss besser werden)
  module.exports = {
    AddressModel : AddressModel,
    PersonalSettingModel : PersonalSettingModel,
    PersonModel : PersonModel
  };
}
