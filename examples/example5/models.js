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


var EntryModel = new model("Entry")
  .attr("text", Type.string)
;


///////////////////

if (typeof window === 'undefined') {
  // we don't run in a browser environment

  module.exports = {
    EntryModel : EntryModel
  };
}