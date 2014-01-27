var model = require('../../../lib/model.js');

var Type = {
  "string" : "string",
  "int" : "int"
};

var PostingModel = new model("Posting")
  .attr("text", Type.string)
  .attr("date", Type.string)
;

var ProfileModel = new model("Profile")
  .attr("vision", Type.string)
  .attr("experience", Type.string)
;

var AddressModel = new model("Adress")
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
  .attrRef("profile", ProfileModel)
  .attrRefArray("postings", PostingModel)
  .operation("resetPassword")
;


PersonModel.operationImpl("resetPassword", function() {
  console.log('reset password Operation called!');
});



if (typeof window === 'undefined') {  // todo: conditional code (muss besser werden)
  module.exports = {
    PostingModel : PostingModel,
    ProfileModel : ProfileModel,
    AddressModel : AddressModel,
    PersonalSettingModel : PersonalSettingModel,
    PersonModel : PersonModel
  };
}
