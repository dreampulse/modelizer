'use strict';

var connector = Model.AngularConnector("http://localhost:6123/");
PersonModel.connection(connector);

describe('Integration Tests', function() {

  it('Person Models should be empty', function(done) {
    PersonModel.use.all()
      .then(function(obj) {
        if (obj.length != 0) done("PersonModel should be empty");
        done();
      })
      .fail(function(err) {
        done('Promise Failed');
      }).done();
  });

  /*
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
  */

  var person1_id;
  it('should be possible to create a Object', function(done) {
    var person1 = PersonModel.createObject();
    person1.name = "Test User";
    person1.eMail = "test@test.com";
    person1.age = 99;

    person1.save()
      .then(function() {
        if (person1._id == undefined) done("didn't get an id from the server!");
        person1_id = person1._id; // save id for next test
        done();
      })
      .fail(function(err) {
        done('Fail to save the object', err);
      })
      .done();
  });

  it('should be possible to get the created object', function(done) {

//    PersonModel.use.get(person1_id)
//      .then(function(obj))
  });

});