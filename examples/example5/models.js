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


var CommentModel = new model("Comment")
  .attr("text", Type.string)
;

var ArticleModel = new model("Article")
  .attrArray("comments", CommentModel)
;


///////////////////

if (typeof window === 'undefined') {
  // we don't run in a browser environment

  module.exports = {
    CommentModel : CommentModel,
    ArticleModel : ArticleModel
  };
}