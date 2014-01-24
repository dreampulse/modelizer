'use strict';

var connector = Model.AngularConnector("http://localhost:6123/");
PersonModel.connection(connector);


// http://stackoverflow.com/questions/17544965/unhandled-rejection-reasons-should-be-empty
Q.stopUnhandledRejectionTracking();  // why does this happen?

describe('Integration Tests', function() {

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