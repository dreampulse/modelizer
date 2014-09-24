/**
  *  The Client implementation of Modelizer
  *
  *  run:
  *  browserify ./lib/angular-client.js -r ./lib/angular-client:modelizer -r q -o ./browser-dist/modelizer-angular.js
  */

var Q = require('q');

var assert = require('./microlibs').assert;
var check = require('./microlibs').check;
var isEmptyObject = require('./microlibs').isEmptyObject;


var Model = require('./model');


// Using the REST-Interface
Model.AngularConnector = function (connectionUrl) {
  assert(angular !== undefined, "AngularJS has to be loaded!");

  var $http = angular.injector(['ng']).get('$http');

  var unpackInterceptor = function (model, callback) {
    return function (err, docs) {

      if (err == undefined) {
        if (Array.isArray(docs)) {  // result is a collection
          for (var i = 0; i < docs.length; i++) {
            model._transform(model, docs[i], 'unpack');
          }
        } else {
          model._transform(model, docs, 'unpack');
        }
      }

      callback(err, docs);
    }
  };


  // ajax Call to the server backend
  var ajaxCall = function (method, url, data, callback) {

    $http({method: method, url: url, data: data, withCredentials: true, cache: false})
      .success(function (data, status, headers, config) {
        if (status == 200) {
          if (!status.hasOwnProperty("error")) {
            callback(undefined, data);
          } else {
            callback(status.error, null);
          }
        } else {
          callback(new Error("HTTP Response != 200"), null);
        }
      })
      .error(function (data, status, headers, config) {
        if (data.hasOwnProperty("error")) {
          callback(new Error(data.error), null);
        } else {
          callback(new Error("Error in $http-request"), null);
        }
      });
  };


  return function (theModel) {
    return {
      find: function (search, callback) {
        if (isEmptyObject(search)) {
          ajaxCall('GET', connectionUrl + theModel.modelName + '/all', undefined, unpackInterceptor(theModel, callback));
        } else {
          ajaxCall('POST', connectionUrl + theModel.modelName + '/find', search, unpackInterceptor(theModel, callback));
        }
      },
      findOne: function (search, callback) {
        assert(search.hasOwnProperty("_id"), "Only searching for id implemented so far");
        ajaxCall('GET', connectionUrl + theModel.modelName + '/' + search._id, undefined, unpackInterceptor(theModel, callback));
      },
      save: function (doc, callback) {
        theModel._transform(theModel, doc, 'pack');
        ajaxCall('PUT', connectionUrl + theModel.modelName + '/', doc, callback);
      },
      remove: function (id, ignored, callback) {
        ajaxCall('DELETE', connectionUrl + theModel.modelName + '/' + id._id, undefined, callback);
      },
      callOperation: function (opName, params, HTMLrequest) {
        var deferred = Q.defer();
        ajaxCall('PUT', connectionUrl + theModel.modelName + '/' + opName, params, function (err, result) {

          if (theModel.operations.hasOwnProperty(opName)) {  // call is an operation

            if (err) deferred.reject(err);
            else deferred.resolve(result);

          } else if (theModel.factorys.hasOwnProperty(opName)) {  // call is an factory

            unpackInterceptor(theModel, function(err, result) {

              if (err) {
                deferred.reject(err);
                return deferred.promise;
              }

              // restore object from document
              if (Array.isArray(result)) {  // result is a collection
                // für jedes document in der DB ein object anlegen
                for (var i = 0; i < result.length; i++) {
                  result[i] = theModel.loadFromDoc(result[i]);
                }
              } else {  // result is one object
                result = theModel.loadFromDoc(result);  // restore one object
              }

              deferred.resolve(result);

            })(err, result);

          } else {
            assert(false, "operation or factory is not defined");
          }
        });

        return deferred.promise;
      }
    }
  }
};


//////////////////////////////////////
// extra angular.js features

Model.prototype.angular = function(scope) {
  this.scope = scope;
};


Model.prototype.$get = function(id) {
  var scope = this.scope;

  var obj = this.create();  // create the object
  this.getQ(id, obj).then(function(o) {
    //obj = o;  // optional
    scope.$apply();
  }).done();
  return obj;
};



Model.prototype.$find = function(query) {
  var scope = this.scope;

  var objs = this.createCollection();  // create the object
  this.findQ(query, objs).then(function(os){
    scope.$apply();
  }).done();
  return objs;
};


Model.prototype.$all = function() {
  var scope = this.scope;

  var objs = this.createCollection();   // create the object
  this.allQ(objs).then(function(os){
    scope.$apply();
  }).done();
  return objs;
};

/*
 var org_create = Model.prototype.create;
 Model.prototype.create = function(initValues) {
 var scope = this.scope;
 var obj = org_create.call(this, initValues);

 obj.$save = function() {
 obj.save.then(function() {
 scope.$apply();
 }).done();
 };

 obj.$remove = function() {
 obj.remove.then(function() {
 scope.$apply();
 }).done();
 };

 return obj;
 }
 */


// CommonJS
module.exports = Model;
