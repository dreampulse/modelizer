/**
 * Created by jonathan on 14.03.14.
 */

(function() {

  if (Model == undefined) throw new Error("Load Modelizer first!");

  Model.prototype.angular = function(scope) {
    this.scope = scope;
  };


  Model.prototype.$get = function(id) {
  	var scope = this.scope;
    
    var obj = this.create();  // create the object
    this.get(id, obj).then(function(o) {
   	  //obj = o;  // optional
      scope.$apply();
    }).done();
    return obj;
  };


  Model.prototype.$findById = Model.prototype.$get;

  
  Model.prototype.$find = function(query) {
    var scope = this.scope;

    var objs = this.createCollection();  // create the object
    this.find(query, objs).then(function(os){
      scope.$apply();
    }).done();
    return objs;
  };


  Model.prototype.$all = function() {
    var scope = this.scope;

    var objs = this.createCollection();   // create the object
    this.all(objs).then(function(os){
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
})();
