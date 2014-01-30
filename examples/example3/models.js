'use strict';

/**
 * Models the Modelizer example
 *
 * Created by Jonathan Häberle
 */


var model = require('../../lib/model.js');

// TODO: remove this
var Type = {
  "string" : "string",
  "int" : "int",
  "ObjectId" : "ObjectId"
};


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