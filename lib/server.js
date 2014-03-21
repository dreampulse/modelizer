

module.exports = {
  serve : function() {
	  var self = this;

	  // filter to allow cross origin requests
	  this.app.all('*', function(req, res, next) {
	    res.header('Access-Control-Allow-Credentials', true);
	    //res.header("Access-Control-Allow-Origin", "*");
	    res.header('Access-Control-Allow-Origin', req.headers.origin);
	    res.header('Access-Control-Allow-Methods', 'OPTIONS,GET,POST,PUT,DELETE');
	    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
	    if ('OPTIONS' == req.method) { return res.send(200); }
	    next();
	  });


	  // REST - GET all
	  this.app.get('/' + this.modelName + '/all', function(req, res){

	    res.setHeader('Content-Type', 'application/json');
	    self.filtered_all(req)
	      .then(function(docs) {
	        // pack data for transport
	        for (var i=0; i<docs.length; i++) {
	          self._transform(self, docs[i], "pack");
	        }
	        res.send(JSON.stringify(docs, null, 2));
	      })
	      .fail(function (err) {
	        if (!err.statusCode) console.log("Error in HTTP GET - all()\n", err.message, "\nStack:\n", err.stack);
	        res.send(err.statusCode || 500, {error: err.message} );
	      }).done();
	  });

	  /*
	   * Security Issue
	   * transform ObjectID!!
	   */

	  // REST - GET find
	  this.app.post('/' + this.modelName + '/find', function(req, res){
	    res.setHeader('Content-Type', 'application/json');
	    self.filtered_find(req.body, req)
	      .then(function(docs) {
	        // pack data for transport
	        for (var i=0; i<docs.length; i++) {
	          self._transform(self, docs[i], "pack");
	        }
	        res.send(JSON.stringify(docs, null, 2));
	      })
	      .fail(function (err) {
	        if (!err.statusCode) console.log("Error in HTTP GET - find()\n", err.message, "\nStack:\n", err.stack);
	        res.send(err.statusCode || 500, {error: err.message} );
	      }).done();
	  });


	  // REST - GET id
	  this.app.get('/' + this.modelName + '/:id', function(req, res) {
	    res.setHeader('Content-Type', 'application/json');
	    self.filtered_get(req.params.id, req)
	      .then(function(doc) {
	        // pack data for transport
	        self._transform(self, doc, "pack");
	        res.send(JSON.stringify(doc, null, 2));
	      })
	      .fail(function (err) {
	        if (!err.statusCode) console.log("Error in HTTP GET - get()\n", err.message, "\nStack:\n", err.stack);
	        res.send(err.statusCode || 500, {error: err.message} );
	      }).done();
	  });

	  // REST - save doc
	  this.app.put('/' + this.modelName, function(req, res) {
	    assert(req.body != undefined, "request body missing! Use bodyParser!");

	    res.setHeader('Content-Type', 'application/json');

	    // client sendet obj._id als string ->  in ObjectId umwandeln
	    if (req.body._id != undefined) {
	      var ObjectId = require('mongojs').ObjectId;
	      try {
	        req.body._id = ObjectId(req.body._id);
	      } catch (e) {
	        res.send(err.statusCode || 400, {error: "Invalid ObjectId Format"} );
	        return;
	      }
	    }

	    // unpack data for storage
	    self._transform(self, req.body, "unpack");

	    self.filtered_save(req.body, req)
	      .then(function(doc) {
	        res.send(JSON.stringify(doc, null, 2));
	      })
	      .fail(function (err) {
	        if (!err.statusCode) console.log("Error in HTTP GET - save()\n", err.message, "\nStack:\n", err.stack);
	        res.send(err.statusCode || 500, {error: err.message} );
	      }).done();
	  });

	  // REST - remove doc
	  this.app.del('/' + this.modelName + '/:id', function(req, res) {
	    res.setHeader('Content-Type', 'application/json');
	    self.filtered_remove(req.params.id, req)
	      .then(function() {
	        res.send(200);
	      })
	      .fail(function (err) {
	        if (!err.statusCode) console.log("Error in HTTP GET - remove()\n", err.message, "\nStack:\n", err.stack);
	        res.send(err.statusCode || 500, {error: err.message} );
	      }).done();
	  });


	  // REST - PUT operation
	  this.app.put('/' + this.modelName + '/:op', function(req, res) {
	    res.setHeader('Content-Type', 'application/json');
	    assert(req.body != undefined, "No body in request!")
	    self.filtered_callOp(req.params.op, req.body, req)
	      .then(function(result) {
	        res.send(200, result);
	      })
	      .fail(function (err) {
	        if (!err.statusCode) console.log("Error in HTTP GET - operation()\n", err.message, "\nStack:\n", err.stack);
	        res.send(err.statusCode || 500, {error: err.message} );
	      }).done();

	  });
	
	},

	// use default get
	filtered_get : function(id_str, req) {
	  var ObjectId = require('mongojs').ObjectId;
	  var id;

	  try {
	    id = ObjectId(id_str);
	  } catch (e) {
	    var deferred = Q.defer();
	    deferred.reject(new Error("Invalid ObjectId Format"));
	    return deferred.promise;
	  }

	  return this.filtered_find({_id:id}, req)
	    .then(function (docs) {
	      if (docs.length != 1) {
	        var deferred = Q.defer();
	        deferred.reject(new Error("Object not found!"));
	        return deferred.promise;
	      }

	      return docs[0];
	    });
	},

	filtered_find : function(search, req) {
	  var filter = this._getReadFilter(req);

	  if (filter === false) {  // deny all
	    var deferred = Q.defer();
	    var deniedError = new Error("Access denied!");
	    deniedError.statusCode = 401;
	    deferred.reject(deniedError);
	    return deferred.promise;
	  }

	  // copy
	  for (var i in filter) {  // erweitere die Suche um den filter
	    search[i] = filter[i];
	    // Achtung: security! Suche muss mit Filterkriterien überschrieben werden!!
	  }

	  // weiterrichen an die eigentliche Suche
	  //console.log(search);
	  return this.find(search);
	},

	filtered_all : function(req) {
	  return this.filtered_find({}, req);
	},

	filtered_save : function(obj, req) {
	  // TODO: ich übergebe da eigentlich ein doc kein obj!!

	  var filter = this._getWriteFilter(obj, req);

	  if (filter === false) {  // deny all
	    var deferred = Q.defer();
	    var deniedError = new Error("Access denied!");
	    deniedError.statusCode = 401;
	    deferred.reject(deniedError);
	    return deferred.promise;
	  }

	  // TODO: der Filter muss irgendwie angewand werden -> da braucht es noch ein Konzept
	//      // copy
	//      for (var i in filter) {  // erweitere die Suche um den filter
	//        search[i] = filter[i];
	//        // Achtung: security! Suche muss mit Filterkriterien überschrieben werden!!
	//      }


	  // weiterrichen an den Aufruf
	  return this.save(obj);

},

	filtered_remove : function(id_str, req) {
	  var self = this;
	  var deferred = Q.defer();

	  var ObjectId = require('mongojs').ObjectId;
	  var id;
	  try {
	    id = ObjectId(id_str);
	  } catch (e) {
	    deferred.reject(new Error("Invalid ObjectId Format"));
	    return deferred.promise;
	  }

	  return self.get(id)
	    .then(function(obj){
	      var filter = self._getWriteFilter(obj, req);

	      if (filter === false) {  // deny all
	        var deniedError = new Error("Access denied!");
	        deniedError.statusCode = 401;
	        deferred.reject(deniedError);
	        return deferred.promise;
	      }

	      // weiterrichen an den Aufruf
	      return self.remove(id);
	    })
	},

	filtered_callOp : function(operationName, params, HTMLrequest) {
	  // todo security
	  // todo: assure that operationName is in this.operations (security)
	  return this.callOp(operationName, params, HTMLrequest);
	}

};
