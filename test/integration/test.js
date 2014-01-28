'use strict';

var connector = Model.AngularConnector("http://localhost:6123/");
PersonModel.connection(connector);
ContentModel.connection(connector);


// http://stackoverflow.com/questions/17544965/unhandled-rejection-reasons-should-be-empty
Q.stopUnhandledRejectionTracking();  // why does this happen?

describe('Integration Tests', function() {

  describe('Basic Functions', function() {

    it('Person Models should be empty', function(done) {
      PersonModel.use.all()
        .then(function(objs) {
          if (objs.length != 0) done("PersonModel should be empty");
          done();
        })
        .fail(function(err) {
          done('Promise Failed');
        }).done();
    });

    it('Get an invalid model should fail', function(done) {
      PersonModel.use.get("01234")
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
      var person1 = PersonModel.createObject();
      person1.name = "Test User";
      person1.eMail = "test@test.com";
      person1.age = 99;

      person1.save()
        .then(function() {
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

      PersonModel.use.get(person1_id)
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
      person1_obj.save()
        .then(function() {

          PersonModel.use.all()
            .then(function(objs) {
              if (objs.length != 1) done("There should still be only one object in the store");
              done();
            })
            .fail(function(err) {
              done('Promise Failed');
            }).done();

        }).fail(function(err) {
          done('Failed to save the object');
        })
        .done();
    });

    it('should be possible to delete an object', function(done){
      person1_obj.remove()
        .then(function() {
          done();
        }).fail(function(err) {
          done('Failed to delete the object');
        })
        .done();
    });

    it('should fail to get the deleted object', function(done) {
      PersonModel.use.get(person1_id)
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
      dave = PersonModel.createObject();
      dave.name = "Dave Test User";
      dave.eMail = "dave@test.com";
      dave.age = 32;
      dave.settings.storageSize = 34;
      dave.settings.password = "geheim";

      var addr = dave.createAddressElement();
      addr.street = "First Home Town Street";
      addr.number = 1;

      dave.createAddressElement();
      dave.address[1].street = "Second Home Town Street"
      dave.address[1].number = 2;

      dave.save()
        .then(function() {
          if (dave._id == undefined) done("didn't get an id from the server!");
          done();
        })
        .fail(function(err) {
          done('Fail to save the object', err);
        })
    });

    it('object should have been created correctly', function(done) {
      PersonModel.use.all()
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

          done();
        })
        .fail(function(err) {
          done('Promise Failed');
        }).done();
    });

    it('delete the object', function(done){
      dave.remove()
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
      bob = PersonModel.createObject();
      bob.name = "Dave Test User";
      
      var profile = bob.profile.createObject();
      profile.vision = "Best Hacker";
      bob.profile.ref().experience = "a lot";

      // save ref object
      profile.save()
        .then(function() {
          assert(profile._id != undefined, "got no id");

          return bob.save();
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
      PersonModel.use.get(bob._id)
        .then(function(obj) {
          loaded_bob = obj;
          return obj.profile.load();
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
      bob.remove()
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
      max = PersonModel.createObject();
      max.name = "Max Mustermann";
      
      posting1 = max.createPostingsObject();
      posting1.text = "The News";

      posting2 = max.createPostingsObject();
      max.postings[1].ref().text = "More news";

      // save all
      posting1.save()  // save posting 1
        .then(function() {
          return max.postings[1].ref().save();  // save posting 2
        })
        .then(function() {
          return max.save();  // save parent object
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
      PersonModel.use.get(max._id)
        .then(function(obj) {
          loaded_max = obj;
          assert(obj.postings.length == 2, "wrong number of references");
          return loaded_max.postings[0].load();
          done();
        })
        .then(function(posting1) { // loaded posting1
          assert(posting1.text == "The News");

          return loaded_max.postings[1].load();
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
      max.remove()
        .then(function() {
          return posting1.remove();
        }).then(function(){
          return posting2.remove();
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

  describe("Filters", function() {
    it('register a user A', function(done){
      ContentModel.register({
          name : "Test User A",
          password : "geheim"
        })
        .then(function(res){
          //console.log(res); -> das ergebniss sollte ein object sein (TODO)
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

    it('shout only be possible to access own object', function(done){
      ContentModel.use.all()
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

  });

});