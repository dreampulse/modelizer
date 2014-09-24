/**
 *  The Client implementation of Modelizer
 *
 *  run:
 *  browserify ./lib/modelizer-client.js -r ./lib/modelizer-client:modelizer -r q -o ./browser-dist/modelizer.js
 */

var Q = require('q');
var http = require('http');

var assert = require('./microlibs').assert;
var check = require('./microlibs').check;
var isEmptyObject = require('./microlibs').isEmptyObject;


var Model = require('./model');


// Using the REST-Interface
Model.ClientConnector = function (host, port) {

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

  var cookie;

  // ajax Call to the server backend
  var ajaxCall = function (method, path, data, callback) {

    var options = {
      host: host,
      port: port,
      path: path,
      method: method,
      withCredentials: true
    }

    if (data != undefined) {
      options.headers = {
        'Content-Type': 'application/json;charset=utf-8',
        'Accept': 'application/json, text/plain, */*'
      };
    } else {
      options.headers = {
        'Accept': 'application/json, text/plain, */*'
      };
    }

    // this is only necessary if you use the client via node
    // browsers handle cookies on their own
    if (cookie) {
      options.headers['Cookie'] = cookie;
    }

    var req = http.request(options, function (res) {

      if (res.headers['set-cookie']) {
        // funktioniert nur mit einem cookie
        cookie = res.headers['set-cookie'][0].split(";")[0];
      }

      var data = '';
      res.on('data', function (chunk) {
        data += chunk;
      });

      res.on('end', function () {
        data = JSON.parse(data);

        if (data.hasOwnProperty("error")) {
          callback(new Error(data.error), null);
        } else {
          if (res.statusCode == 200) {
            callback(undefined, data);
          } else {
            callback(new Error(data.error), null);
          }
        }

      });

    });
    req.on('error', function (e) {
      callback(new Error("Error in HTTP request:\n " + e.message), null);
    });

    if (data != undefined) {
      req.write(JSON.stringify(data));
    }

    req.end();
  };

  /*
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
   */


  return function (theModel) {
    return {
      find: function (search, callback) {
        if (isEmptyObject(search)) {
          ajaxCall('GET', '/' + theModel.modelName + '/all', undefined, unpackInterceptor(theModel, callback));
        } else {
          ajaxCall('POST', '/' + theModel.modelName + '/find', search, unpackInterceptor(theModel, callback));
        }
      },
      findOne: function (search, callback) {
        assert(search.hasOwnProperty("_id"), "Only searching for id implemented so far");
        ajaxCall('GET', '/' + theModel.modelName + '/' + search._id, undefined, unpackInterceptor(theModel, callback));
      },
      save: function (doc, callback) {
        theModel._transform(theModel, doc, 'pack');
        ajaxCall('PUT', '/' + theModel.modelName + '/', doc, callback);
      },
      remove: function (id, ignored, callback) {
        ajaxCall('DELETE', '/' + theModel.modelName + '/' + id._id, undefined, callback);
      },
      callOperation: function (opName, params, HTMLrequest) {
        var deferred = Q.defer();
        ajaxCall('PUT', '/' + theModel.modelName + '/' + opName, params, function (err, result) {

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


// CommonJS
module.exports = Model;
