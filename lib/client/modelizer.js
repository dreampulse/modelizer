/**
 * Created by jonathan on 22.03.14.
 */


var Model = require('./../model');

var clientImpl = require('./../client');


// Using the REST-Interface
Model.AngularConnector = clientImpl.AngularConnector;

module.exports = Model;
