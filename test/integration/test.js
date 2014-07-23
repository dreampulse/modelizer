'use strict';

var Q = require("q");

if (typeof window === 'undefined') {  // running in node-environment
  var modelizer = require("../../lib/modelizer-client");
  var models = require("./shared/models");
  var PersonModel = models.PersonModel;
  var ContentModel = models.ContentModel;
  var PersonalSettingModel = models.PersonalSettingModel;
  var AddressModel = models.AddressModel;
  var ProfileModel = models.ProfileModel;
  var PostingModel = models.PostingModel;

} else {
  // http://stackoverflow.com/questions/17544965/unhandled-rejection-reasons-should-be-empty
  Q.stopUnhandledRejectionTracking();  // why does this happen?

}

if (typeof angular !== 'undefined') {
  var connector = model.AngularConnector("http://localhost:6123/");
} else {
  var connector = modelizer.ClientConnector("localhost", "6123");
}

PersonModel.connection(connector);
PersonalSettingModel.connection(connector);
AddressModel.connection(connector);
ProfileModel.connection(connector);
PostingModel.connection(connector);
ContentModel.connection(connector);

var assert = function (condition, message) {
  if (!condition) {
    console.log('Assertion failed', message);
    console.trace();
    throw new Error(message || "Assertion failed");
  }
};


describe('Integration Tests', function() {

  describe('Basic Functions', function() {

    it('Person Models should be empty', function(done) {
      PersonModel.allQ()
        .then(function(objs) {
          if (objs.length != 0) done("PersonModel should be empty");
          done();
        })
        .fail(function(err) {
          done('Promise Failed', err);
        }).done();
    });

    it('Get an invalid model should fail', function(done) {
      PersonModel.getQ("01234")
        .then(function(obj) {
          done("Promise should fail");
        })
        .fail(function(err) {
          if (err.message != "Invalid ObjectId Format") done("Unknown error returned");
          done();
        }).done();
    });

    var person1_id;
    it('should be possible to create a Object', function(done) {
      var person1 = PersonModel.create();
      person1.name = "Test User";
      person1.eMail = "test@test.com";
      person1.age = 99;
      person1.saveQ()
        .then(function(resObj) {
          if (person1._id == undefined) done("didn't get an id from the server!");
          person1_id = person1._id; // save id for next tests
          done();
        })
        .fail(function(err) {
          done('Fail to save the object', err);
        })
        .done();
    });

    var person1_obj;
    it('should be possible to get the created object', function(done) {

      PersonModel.getQ(person1_id)
        .then(function(obj) {
          if (obj._id != person1_id) done("Object has an invalid id");
          if (
            obj.name !== "Test User" &&
            obj.eMail !== "test@test.com" &&
            obj.age === 99
            ) done("Test field are invalid");

          person1_obj = obj;  // save object for next tests
          done();
        }).fail(function(err) {
          done('Failed get the object', err);
        })
        .done();
    });

    it('should be possible to change some values and save again', function(done){
      person1_obj.name = "Steve Gates";
      person1_obj.saveQ()
        .then(function() {
          return PersonModel.allQ()
        })
        .then(function(objs) {
          if (objs.length != 1) return done("There should still be only one object in the store");
          done();
        }).fail(function(err) {
          done(err);
        })
        .done();
    });

    it('should be possible to delete an object', function(done){
      person1_obj.removeQ()
        .then(function() {
          done();
        }).fail(function(err) {
          done('Failed to delete the object');
        })
        .done();
    });

    it('should fail to get the deleted object', function(done) {
      PersonModel.getQ(person1_id)
        .then(function(obj) {
          done("There should be no result");
        })
        .fail(function(err) {
          if (err.message != "Object not found!") done("Unknown error message!");
          done();
        }).done();
    });

  });

  describe('Array and Object Attributes Functions', function() {
    var dave;
    it('create Object', function(done) {
      dave = PersonModel.create();
      dave.name = "Dave Test User";
      dave.eMail = "dave@test.com";
      dave.age = 32;
      dave.settings.storageSize = 34;
      dave.settings.password = "geheim";

      var addr = dave.createAddress();
      addr.street = "First Home Town Street";
      addr.number = 1;

      dave.createAddress();
      dave.address[1].street = "Second Home Town Street";
      dave.address[1].number = 2;

      dave.saveQ()
        .then(function() {
          if (dave._id == undefined) done("didn't get an id from the server!");
          done();
        })
        .fail(function(err) {
          done('Fail to save the object', err);
        })
    });

    it('object should have been created correctly', function(done) {
      PersonModel.allQ()
        .then(function(objs) {
          if (objs.length != 1) done("PersonModel should have only one object");

          var d = objs[0];
          assert(d.name === "Dave Test User");
          assert(d.eMail === "dave@test.com");
          assert(d.age === 32);
          assert(d.settings.storageSize === 34);
          assert(d.settings.password === "geheim");

          assert(d.address.length == 2);

          assert(d.address[0].street === "First Home Town Street");
          assert(d.address[0].number === 1);
          assert(d.address[1].street === "Second Home Town Street");
          assert(d.address[1].number === 2);

          if (!d.address[0]._id) done("Objects in array should have a _id");

          done();
        })
        .fail(function(err) {
          done('Promise Failed');
        }).done();
    });

    it('delete the object', function(done){
      dave.removeQ()
        .then(function() {
          done();
        }).fail(function(err) {
          done('Failed to delete the object');
        })
        .done();
    })

  });


  describe("References", function() {
    
    var bob; 
    it("should be possible to create an object with a reference", function(done){
      bob = PersonModel.create();
      bob.name = "Dave Test User";
      
      var profile = bob.profile.create();
      profile.vision = "Best Hacker";
      bob.profile.ref().experience = "a lot";

      // save ref object
      profile.saveQ()
        .then(function() {
          assert(profile._id != undefined, "got no id");

          return bob.saveQ();
        })
        .then(function() {
          assert(bob.profile._reference == bob.profile.ref()._id, "reference id fail");
          done();
        })
        .fail(function(err) {
          done(err);
        });
    });

    it("should be possible to load an object with a reference", function(done){
      var loaded_bob;
      PersonModel.getQ(bob._id)
        .then(function(obj) {
          loaded_bob = obj;
          return obj.profile.loadQ();
        })
        .then(function() {
          if (loaded_bob.profile.ref().vision !== "Best Hacker") done("failed to load reference");
          done();
        })
        .fail(function(err) {
          done(err);
        });
    });

    it('delete the object', function(done){
      bob.removeQ()
        .then(function() {
          done();
        }).fail(function(err) {
          done('Failed to delete the object');
        })
        .done();
    })
  
  });

  describe("1..n References", function() {
    var max; 
    var posting1;
    var posting2;
    it("should be possible to create an object with an 1..n reference", function(done){
      max = PersonModel.create();
      max.name = "Max Mustermann";
      
      posting1 = max.createPostings();
      posting1.text = "The News";

      posting2 = max.createPostings();
      max.postings[1].ref().text = "More news";

      // save all
      posting1.saveQ()  // save posting 1
        .then(function() {
          return max.postings[1].ref().saveQ();  // save posting 2
        })
        .then(function() {
          return max.saveQ();  // save parent object
        })
        .then(function() {
          // everything has been saved
          done();
        })
        .fail(function(err) {
          done(err);
        });
    });

    it("should be possible to load an object with an 1..n reference", function(done) {
      var loaded_max;
      PersonModel.getQ(max._id)
        .then(function(obj) {
          loaded_max = obj;
          assert(obj.postings.length == 2, "wrong number of references");
          return loaded_max.postings[0].loadQ();
          done();
        })
        .then(function(posting1) { // loaded posting1
          assert(posting1.text == "The News");

          return loaded_max.postings[1].loadQ();
        })
        .then(function(posting2) { // loaded posting2
          assert(loaded_max.postings[1].ref().text == "More news");

          done();
        })
        .fail(function(err) {
          done(err);
        }); 
    });

    it('delete the objects', function(done){
      max.removeQ()
        .then(function() {
          return posting1.removeQ();
        }).then(function(){
          return posting2.removeQ();
        }).then(function(){
          done(); // deleted all
        }).fail(function(err) {
          done('Failed to delete the objects');
        });
    })

  });

  describe("Operations", function() {
    it('should be possible to call an operation', function(done){
      PersonModel.testOp({param1:"testParam"})
        .then(function(res){
          if (res.result != "someStuff") done("invalid result");
          else done();
        })
        .fail(function(err) {
          done(err);
        });
    });
  });

  describe("Factories", function() {
    it('should be possible to use factories', function(done){
      Q()
        .then(function() {
          var p1 = PersonModel.create();
          p1.name = "Max";
          p1.age = 18;
          return p1.saveQ();
        })
        .then(function() {
          var p2 = PersonModel.create();
          p2.name = "Moritz";
          p2.age = 19;
          return p2.saveQ();
        })
        .then(function() {
          return PersonModel.getSpecialObject();
        })
        .then(function(obj) {
          //console.log(obj);
          if (typeof obj[0].saveQ != 'function') done("Factory hasn't restored the object");
          done();
        })
        .fail(function(err) {
          done(err);
        });
    });
  });

  describe("Find", function() {
    it('should be possible to search for objects using find()', function(done){
      var p1 = PersonModel.create();
      p1.name = "Person 1";

      var p2 = PersonModel.create();
      p2.name = "Person 2";

      Q()
        .then(function() {
          return p1.saveQ();
        })
        .then(function() {
          return p2.saveQ();
        })
        .then(function() {
          return PersonModel.findQ({name:"Person 2"});
        })
        .then(function(pers) {
          assert(pers.length == 1);
          assert(pers[0].name == "Person 2");
          done();
        })
        .fail(function(err){
          done(err);
        });
    })
  });

  describe("Filters", function() {
    var obj;
    it('should fail to save an object without login', function(done){
      ContentModel.create().saveQ()
        .then(function(){
          done("it should have failed");
        })
        .fail(function(err) {
          if (err.message == 'Access denied!') done();
          else done("Wrong error!");
        });
    });

    it('register a user A', function(done){
      ContentModel.register({
          name : "Test User A",
          password : "geheim"
        })
        .then(function(res){
          done();
        })
        .fail(function(err) {
          done(err);
        });
    });

    it('register a user B', function(done){
      ContentModel.register({
        name : "Test User B",
        password : "geheim"
      })
        .then(function(res){
          done();
        })
        .fail(function(err) {
          done(err);
        });
    });

    it('login', function(done){
      ContentModel.login({
        name : "Test User A",
        password : "geheim"
      })
        .then(function(res){
          done();
        })
        .fail(function(err) {
          done(err);
        });
    });

    it('should only be possible to access own object', function(done){
      ContentModel.allQ()
        .then(function(objs){
          //console.log(objs);
          if (objs.length != 1) done("Error in read filters");
          if (objs[0].name !== "Test User A") done("Wrong user");

          done();
        })
        .fail(function(err) {
          done(err);
        });
    });

    it('should have a working afterReadFilter', function(done) {
      ContentModel.allQ()
        .then(function(objs){
          if (objs.length != 1) done("One element expected");
          if (objs[0].afterRead !== 'it worked!') done("afterReadFilterFailed");

          obj = objs[0];

          done();
        })
        .fail(function(err) {
          done(err);
        });
    });

    it('should succeeded to save an object when being logged in', function(done){
      var obj = ContentModel.create();
      obj.saveQ()
        .then(function(){
          done();
        })
        .fail(function(err) {
          done(err);
        });
    });

    it('logout', function(done){
      ContentModel.logout()
        .then(function(){
          done();
        })
        .fail(function(err) {
          done(err);
        });
    });

    // TODO: write filters
  });

  describe("handle date types", function() {
    it('after saving date attribute it shout be preserved', function(done){

      var pers = PersonModel.create({
        name : "Born today",
        birthday : new Date()
      })

      pers.saveQ().then(function() {
        return PersonModel.getQ(pers._id);
      })
      .then(function(pers){
        if (!pers.birthday instanceof Date) done("Isn't a date Object");
        done();
      }).done();

    });
  });

  describe("Cleanup", function() {
    it('Cleanup Database', function(done){
      ContentModel.cleanup()
        .then(function(){
          done();
        })
        .done();
    });
  });

});