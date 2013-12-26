var assert = require("assert")

describe('Model 1', function() {
  var model = require('../lib/model');

  var Type = {
    "string" : "string",
    "int" : "int"
  };

  var MyModel1 = new model("MyModel1").attr("attr1", Type.string).attr("attr2", Type.string);

  var mongojs = require('mongojs');
  var db = mongojs('mongodb://127.0.0.1/testModel1');
  MyModel1.mongoDB(db);

  describe('Basic Functions', function(){
    var myObject1;

    it('start with clean database', function(done) {
      // clean testing database
      db.collection("MyModel1").drop(function(err, res) {
        done();
      });
    });

    it('should be possible to create an object from the Model', function(){
      myObject1 = MyModel1.createObject();
      myObject1.attr1 = "value1";
      myObject1.attr2 = "value2";
    });

    it('the object should have correct attributes and the save/remove-method', function(){
      assert(myObject1.attr1 === "value1");
      assert(myObject1.attr2 === "value2");
      assert(myObject1.hasOwnProperty('save'));
      assert(myObject1.hasOwnProperty('remove'));
    });

    it('saved object correctly saved to database', function(done) {
      myObject1.save()
        .then(function() {
          db.collection("MyModel1").findOne(function(err, doc) {
            assert(doc.attr1 === "value1");
            assert(doc.attr2 === "value2");
            assert(doc.hasOwnProperty("_id"));
            done();
          });
        })
        .fail(function(err) {
          done(err);
        });
    });

    it('saved object can be found with model search method .all()', function(done) {
      MyModel1.use.all()
        .then(function(objs){
          assert(objs.length === 1);
          var doc = objs[0];
          assert(doc.attr1 === "value1");
          assert(doc.attr2 === "value2");
          done();
        })
        .fail(function(err) {
          done(err);
        });
    });

  })
})
