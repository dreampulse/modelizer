/**
 * Created by jonathan on 14.03.14.
 */

(function() {

  Model.prototype.angular = function(scope) {
    this.scope = scope;
  };

  //Model.prototype.findByIdQ = Model.prototype.findById;
  Model.prototype.$findById = function(id) {
    var scope = this.scope;
    var obj = {};
    this.findById(id).then(function(o) {
      angular.copy(o, obj);
      scope.$apply();
    }).done();
    return obj;
  };

  // todo, eigene copy function

  //Model.prototype.getQ = Model.prototype.get;
  Model.prototype.$get = function(s, to, id) {
    var scope = this.scope;
    var obj = {};
    this.get(id).then(function(o) {
      s[to] = o;
      scope.$apply();
    }).done();
    return obj;
  };

//  //Model.prototype.getQ = Model.prototype.get;
//  Model.prototype.$get = function(id) {
//    var scope = this.scope;
//    var obj = {};
//    this.get(id).then(function(o) {
//      angular.copy(o, obj);
//      scope.$apply();
//    }).done();
//    return obj;
//  };

  //Model.prototype.findQ = Model.prototype.find;
  Model.prototype.$find = function(id) {
    var scope = this.scope;
    var objs = [];
    this.find(id).then(function(os){
      angular.copy(os, objs);
      scope.$apply();
    }).done();
    return objs;
  };

  //Model.prototype.allQ = Model.prototype.all;
  Model.prototype.$all = function(to) {
    var scope = this.scope;
    this.all(id).then(function(os){
      to = os;
      scope.$apply();
    }).done();
    return objs;
  };

//  //Model.prototype.allQ = Model.prototype.all;
//  Model.prototype.$all = function() {
//    var scope = this.scope;
//    var objs = [];
//    console.log("this.allQ", this.allQ);
//    this.all(id).then(function(os){
//      angular.copy(os, objs);
//      scope.$apply();
//    }).done();
//    return objs;
//  };


  var org_create = Model.prototype.create;
  Model.prototype.create = function(initValues) {
    var scope = this.scope;
    var obj = org_create.call(this, initValues);

    //obj.saveQ = obj.save;
    obj.$save = function() {
      obj.save.then(function() {
        scope.$apply();
      }).done();
    };

    //obj.removeQ = obj.remove;
    obj.$remove = function() {
      obj.remove.then(function() {
        scope.$apply();
      }).done();
    };

    return obj;
  }

})();
