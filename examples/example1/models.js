'use strict';

/**
 * Models the Modelizer example
 *
 * Created by Jonathan Häberle
 */


var model = require('../../lib/model.js');
var Type = model.Attr.Types;



// our model
var UserModel = new model("User")
  .attr("username", Type.string)
  .attr("password", Type.string)
;




if (typeof window === 'undefined') {
  // we don't run in a browser environment

  module.exports = {
    UserModel : UserModel
  };
}