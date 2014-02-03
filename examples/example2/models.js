'use strict';

/**
 * Models the Modelizer example
 *
 * Created by Jonathan Häberle
 */


var model = require('../../lib/modelizer.js');
var Type = model.Attr.Types;


///////////////////
// My Models


var ContentModel = new model("Content")
  .attr("text", Type.string)
  .attr("owner", Type.ObjectId)
;

var UserModel = new model("User")
  .attr("username", Type.string)
  .attr("password", Type.string)
  .operation("register")
  .operation("login")
;


///////////////////

if (typeof window === 'undefined') {
  // we don't run in a browser environment

  module.exports = {
    ContentModel : ContentModel,
    UserModel : UserModel
  };
}