var model = require('../../../lib/model.js');

var Type = require('../../../lib/model.js').Attr.Types;

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
  .attr("number", Type.number)
;

var PersonalSettingModel = new model("PersonalSetting")
  .attr("storageSize", Type.number)
  .attr("password", Type.string)
  .attr('enabled', Type.string)
;

var PersonModel = new model("Person")
  .attr("name", Type.string)
  .attr("eMail", Type.string)
  .attr("age", Type.number)
  .attrArray("address", AddressModel)
  .attrObj("settings", PersonalSettingModel)
  .attrRef("profile", ProfileModel)
  .attrRefArray("postings", PostingModel)
  .operation("testOp")  // for implementation see server.js
;


// Testing filters
var ContentModel = new model("Content")
  .attr("stuff", Type.string)
  .attr("username", Type.string)
  .attr("password", Type.string)
  .operation("register")
  .operation("login")
;


if (typeof window === 'undefined') {  // todo: conditional code (muss besser werden)
  module.exports = {
    ContentModel : ContentModel,
    PostingModel : PostingModel,
    ProfileModel : ProfileModel,
    AddressModel : AddressModel,
    PersonalSettingModel : PersonalSettingModel,
    PersonModel : PersonModel
  };
}
