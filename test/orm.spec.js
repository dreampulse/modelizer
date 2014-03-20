var assert = require("assert");
var Q = require('q');

describe('Modelizer', function() {
  var model = require('../lib/modelizer');
  var Attr = model.Attr;
  var Ref = model.Ref;
  var RefArray = model.RefArray;
  var Operation = model.Operation;
  var Factory = model.Factory;
  var Types = model.Attr.Types;

  var MyModel1 = new model("MyModel1").attr("attr1", Types.string).attr("attr2", Types.string);

  var mongojs = require('mongojs');
  var db = mongojs('mongodb://127.0.0.1/testModel1');
  var connector = model.MongoConnector(db);
  MyModel1.connection(connector);

  describe('Basic Functions', function(){
    var myObject1;
    var myObject1_id;

    it('start with clean database', function(done) {
      // clean testing database
      db.collection("MyModel1").drop(function(err, res) {
        done();
      });
    });

    it('should be possible to create an object from the Model', function(){
      myObject1 = MyModel1.create();
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
            myObject1_id = doc._id;
            done();
          });
        })
        .fail(function(err) {
          assert(false);
          done(err);
        })
        .done();
    });

    it('saved object can be found with model search method .all()', function(done) {
      MyModel1.all()
        .then(function(objs){
          assert(objs.length === 1);
          var doc = objs[0];
          assert(doc.attr1 === "value1");
          assert(doc.attr2 === "value2");
          done();
        })
        .fail(function(err) {
          assert(false);
          done(err);
        })
        .done();
    });


    it('should be possible to save again', function(done) {
      myObject1.save()
        .then(function() {
          return MyModel1.all()
            .then(function(objs){
              assert(objs.length === 1, "There should still be only one object in the store");
              done();
            })
        })
        .fail(function(err) {
          done(err);
        })
        .done();
    });


    it('can be found by using .get() search method', function(done) {
      MyModel1.get(myObject1_id)
        .then(function(obj) {
          assert(""+obj._id === ""+myObject1_id);
          done();
        })
        .fail(function(err) {
          assert(false);
          done(err);
        })
        //.done();
    });

    it('can be found by using .find() to search for an attribute', function(done) {
      MyModel1.find({'attr1':'value1'})
        .then(function(obj) {
          assert(obj.length === 1);
          assert(""+obj[0]._id === ""+myObject1_id);
          done();
        })
        .fail(function(err) {
          assert(false);
          done(err);
        })
        //.done();
    });

    it('should be possible to delete object', function(done){
      myObject1.remove()
        .then(function() {
          done();
        })
        .fail(function(err) {
          assert(false);
          done(err);
        })
        //.done();
    });

    it('should fail to delete an unsaved object', function(done){
      myObject1.remove()
        .then(function() {
          assert(false);
          done(false);
        })
        .fail(function(err) {
          done();
        })
        //.done();
    });

  });


  var MyModel2 = new model("MyModel2").attr("myAttr", Types.string).attrArray("myArray", MyModel1).attrObj("myAttrObj", MyModel1);
  MyModel2.connection(connector);

  describe('Array and Object Attributes', function() {
    var myObject2;

    it('start with clean database', function(done) {
      // clean testing database
      db.collection("MyModel2").drop(function(err, res) {
        done();
      });
    });


    it('start with one object', function(done) {
      myObject2 = MyModel2.create();
      assert(myObject2.myAttr === null);
      assert(myObject2.myArray.length === 0);
      assert(myObject2.myAttrObj.hasOwnProperty('attr1') && myObject2.myAttrObj.hasOwnProperty('attr2'));

      myObject2.save()
        .then(function() {
          done();
        })
        .fail(function(err) {
          done(err);
        })
        .done();

    });

    it('get Object with createMyArray()', function(done) {
      var el = myObject2.createMyArray();
      assert(el.hasOwnProperty('attr1') && el.hasOwnProperty('attr2'));
      assert(myObject2.myArray[0] === el);
      done();
    });

    it('should be possible to createMyArray() from a loaded object', function(done){
      MyModel2.get(myObject2._id)
        .then(function(obj){
          var el = obj.createMyArray();
          el.attr1 = "test";
          assert(obj.myArray.length == 1);
          assert(obj.myArray[0].attr1 == "test");

          return obj.save();
        })
        .then(function(obj){
          done();
        })
        .done();
    });

    it('load attrArray', function(done){
      MyModel2.get(myObject2._id)
        .then(function(obj){
          assert(obj.myArray.length == 1, "attrArry should have been loaded");
          assert(obj.myArray[0].attr1 == "test");

          done();
        })
        .done();
    });

  });


  var MyModel3 = new model("MyModel3").attr("myAttr", Types.string).attrRef("reference", MyModel1);
  MyModel3.connection(connector);

  describe('Reference to another Model', function() {
    var myObject3;
    var refObj;
    var refObj_id;

    it('start with clean database and one object', function(done) {
      db.collection("MyModel3").drop(function(err, res) {
        myObject3 = MyModel3.create();
        assert(myObject3.myAttr === null);
        assert(typeof myObject3.reference === 'object');
        done();
      });
    });


    it('should be possible to create and save an object with empty reference', function(done) {
      var testObj = MyModel3.create();
      testObj.save()
        .then(function(doc) {
          //TODO: messen, dass ref leer ist
          assert(testObj.reference.ref === undefined, "reference problme");
          done();
        })
        .fail(function(err){
          done(err);
        })
    });


    it('should be possible to create a referenced object', function(done){
      refObj = myObject3.reference.create();
      assert(refObj.hasOwnProperty('attr1') && refObj.hasOwnProperty('attr2'));
      assert(myObject3.reference.ref() === refObj);

      // save the referenced object
      refObj.save()
        .then(function(doc) {
          assert(refObj._reference === undefined, "reference problme");
          refObj_id = doc._id;
          done();
        })
        .fail(function(err){
          done(err);
        })
        //.done();
    });

    it('should be possible to save an object with a reference inside', function(done) {
      myObject3.save()
        .then(function(doc){
          assert(""+myObject3.reference._reference === ""+refObj_id, "reference hasn't been added");
          MyModel1.get(refObj_id)
            .then(function(obj) {
              assert(""+obj._id === ""+myObject3.reference._reference, "the referenced object exists");
              done();
            }).done();
        })
        .fail(function(err){
          done(err);
        })
        //.done();
    });

    it('should be possible to load a referenced object', function(done){
      MyModel3.get(myObject3._id)
        .then(function(obj) {
          try {
            obj.reference.ref();
            assert(false, "should throw an error");
          } catch (e) {
            assert(e instanceof Error);
          }
          //assert(obj.reference.ref === undefined, "shouldn' be loaded at that point of time");
          assert(""+obj.reference._reference == ""+refObj_id, "the reference_id should be loaded correctly");

          obj.reference.load()
            .then(function(loadedObj) {
              assert(""+obj.reference.ref()._id === ""+refObj._id, "not the correct referenced object has been loaded");
              done();
            }).done();

        })
        //.done();
    });

    it('should be possible to set the reference to an arbitrary object', function(done) {
      MyModel1.create().save()
        .then(function(obj) {
          myObject3.reference.setObject(obj);
          assert(""+myObject3.reference._reference == ""+obj._id);
          done();
        });
    });

/*    // TODO
    it('should be possible to delete an referenced object', function(done) {
      refObj.remove()
        .then(function() {
          assert(refObj._id === undefined);
          assert(myObject3.reference._reference === undefined, "reference from parent hasn't been removed");
          assert(myObject3.reference.ref === undefined, "referencing function hasn' been removed");
          done();
        }).done();
    });
*/  
  });


  var MyModel4 = new model("MyModel4").attr("myAttr", Types.string).attrRefArray("models", MyModel1);
  MyModel4.connection(connector);

  describe('1..n References (Array References)', function() {
    var myObject4;
    var refObj1;

    it('start with clean database and one object', function(done) {
      db.collection("MyModel3").drop(function(err, res) {
        myObject4 = MyModel4.create();
        assert(myObject4.myAttr === null);
        assert(typeof myObject4.models === 'object');
        assert(myObject4.hasOwnProperty('createModels'));
        done();
      });
    });

    it('should be possible to create a referenced object', function(done) {
      refObj1 = myObject4.createModels();
      assert(refObj1.hasOwnProperty('attr1') && refObj1.hasOwnProperty('attr2'));
      assert(myObject4.models.length === 1);
      assert(myObject4.models[0].ref() === refObj1);

      refObj1.save()
        .then(function(doc) {
          done();
        })
        .fail(function(err) {
          done(err);
        })
        //.done();
    });

    it('should save the reference array correctly', function(done) {
      myObject4.save()
        .then(function(obj){
          assert(""+myObject4.models[0]._reference === ""+refObj1._id);

          return MyModel4.get(myObject4._id);
        })
        .then(function(doc) {
          assert(""+doc._id === ""+myObject4._id);
          doc.models[0].load()
            .then(function(loadedRefObj1) {

              assert(""+doc.models[0].ref()._id === ""+refObj1._id);

              done();
            }).done();
        })
        .fail(function(err) {
          done(err);
        })
        //.done();
    });

  });


  var MyModel5 = new model("MyModel5").attr("attr1", Types.string).attr("attr2", Types.string);
  MyModel5.connection(connector);

  describe('Filters', function() {
    var obj1, obj2, obj3;

    it('start with clean database and three objects', function(done) {
      db.collection("MyModel5").drop(function(err, res) {
        obj1 = MyModel5.create();
        obj1.attr1 = "A";
        obj1.attr2 = "C";

        obj2 = MyModel5.create();
        obj2.attr1 = "A";
        obj2.attr2 = "B";

        obj3 = MyModel5.create();
        obj3.attr1 = "C";
        obj3.attr2 = "B";

        obj1.save()
          .then(function () {
            return obj2.save();
          })
          .then(function() {
            return obj3.save();
          })
          .then(function() {
            return MyModel5.filtered_all();
          })
          .then(function(objs) {
            assert(objs.length == 3, 'the three objects should have been saved');
            done();
          })
          .fail(function (err) {
            done(err);
          });
      });
    });

    it('use filtered get for obj1', function(done) {
      MyModel5.filtered_get(""+obj1._id)
        .then(function(obj) {
          assert(obj.attr1 === "A" && obj.attr2 === "C");
          done();
        })
        //.done();
    });

    it('filter for attr1 should be A', function(done) {
      MyModel5.readFilter(function () {
        return {attr1 : "A"};
      });

      MyModel5.filtered_all()
        .then(function(objs) {
          assert(objs.length == 2);
          assert(objs[0].attr1 === "A" && objs[1].attr1 === "A");
          done();
        })
        //.done();

    });

    it('add filter for attr2 should be B', function(done) {
      MyModel5.readFilter(function () {
        return {attr2 : "B"};
      });

      MyModel5.filtered_all()
        .then(function(objs) {
          assert(objs.length == 1);
          assert(objs[0].attr1 === "A" && objs[0].attr2 === "B");
          done();
        })
        //.done();

    });

    it('use filtered get for obj2', function(done) {
      MyModel5.filtered_get(""+obj2._id)
        .then(function(obj) {
          assert(obj.attr1 === "A" && obj.attr2 === "B");
          done();
        })
        //.done();
    });

    it("obj1 shouldn't be found", function(done) {
      MyModel5.filtered_get(""+obj1._id)
        .then(function(obj) {
          done("Filter isn't working");
        })
        .fail(function() {
          done();
        });
    });


  });

  describe('Methods and Operations', function() {
    var called = false;
    var myMethod1 = function() {
      called = true;
    };
    var MyModel6 = new model("MyModel6").method("myMethod").methodImpl("myMethod", myMethod1);

    it("should be possible to use methods", function(done) {
      var obj6 = MyModel6.create();
      obj6.myMethod();
      if (!called) done("Method calling failed");
      else done();
    });


    var myOp1 = function(params, req) {
      assert(req === null, "HTTP-Request should be 'null' on local use");
      assert(params.testParam == "paramValue", "Error in parameter handling");
      return "returnValue";
    }
    
    var MyModel7 = new model("MyModel7").operation("myOp").operationImpl("myOp", myOp1);
    MyModel7.connection(connector);

    it("should be possible to use operations", function(done) {
      assert(MyModel7.myOp != undefined, "Method not defined");
      
      MyModel7.myOp({testParam:"paramValue"}).then(function(res) {
        assert(res == "returnValue", "Error in return value handling");
        done();
      })
      .fail(function(err) {
        done(err);
      });

    });

  });

  var MyModel8 = new model("MyModel8").attr("num", Types.number).attr("enum", Types.enum('a', 'b')).attr("name", Types.string, Attr.default("unnamed")).attr("date", Types.date);
  MyModel8.connection(connector);

  describe('Type checks and save filters', function() {

    it("should not be possible to save wrong types", function(done) {
      var obj = MyModel8.create();
      obj.num = "not a number";
      obj.save().fail(function (err){
        assert(err.message == "Can't save 'num' 'not a number' is not a number");
        done();
      }).done();
    });

    it("should be possible to use enums", function(done) {
      var obj = MyModel8.create();
      obj.enum = "b";
      obj.save().then(function (){
        done();
      }).done();
    });

    it("should handle wrong enums", function(done) {
      var obj = MyModel8.create();
      obj.enum = "c";
      obj.save().fail(function (err){
        assert(err.message == "Can't save 'enum' 'c' is not in the enum");
        done();
      }).done();
    });

    it("default attribute should work", function(done) {
      var obj = MyModel8.create();
      obj.save().then(function (){
        if (obj.name != "unnamed") {
          done("default attribute failed");
          return;
        }
        done();
      }).done();
    });

    it("should handle date types", function(done) {
      var obj = MyModel8.create();
      obj.date = "foo";
      obj.save().then(function (){
        done("Wrong date type accepted");
      }).fail(function (err){
        assert(err.message == "Can't save 'date' 'foo' is not a date");
        done();
      }).done();
    });


  });

  // todo array of "premetives"
  describe('Define Model in JSON-Notation', function() {

    var MyModel10 = new model("MyModel10", {
      stuff : Attr(Types.string, Attr.default("some stuff"))
    });
    MyModel10.connection(connector);

    var MyModel9 = new model("MyModel9", {
      aString : Attr(Types.string),
      aNumber : Attr(Types.number),
      aBoolean : Attr(Types.boolean),

      aArrayAttr :  Attr(Types.array),
      
      aArray : [{
        aStringInsideOfTheArray : Attr(Types.string)
      }],
      
      nested: {
        stuff : Attr(Types.string)
      },

      aReference : Ref(MyModel10),
      aManyReferences : RefArray(MyModel10),

      aOperation : Operation(),

      aFactory : Factory()
    });
    MyModel9.connection(connector);

    it('should be possible to define a type', function(done) {
      var obj = MyModel9.create();
      obj.aString = "foo";
      obj.aNumber = 1.2;
      obj.aBoolean = true;

      obj.aArrayAttr = ["foo", "bar"];

      var aArrayEl = obj.createAArray();
      aArrayEl.aStringInsideOfTheArray = "bar";
      //obj.aArray[0].aStringInsideOfTheArray = "bar";

      obj.nested.stuff = "stuff";

      var mm10 = obj.aReference.create();
     
      var amayObj = obj.createAManyReferences();
      amayObj.stuff = "more stuff";

      assert(MyModel9["aOperation"] != undefined);
      assert(MyModel9["aFactory"] != undefined);


      var resObj;
      Q().then(function() {
        return amayObj.save();
      }).then(function() {
      //amayObj.save().then(function() {
        return mm10.save();
      }).then(function() {
        return obj.save();
      }).then(function() {
        return MyModel9.get(obj._id);
      }).then(function(o) {
        resObj = o;
  
        assert(resObj.aString === "foo");
        assert(resObj.aNumber === 1.2);
        assert(resObj.aBoolean === true);

        assert(resObj.aArrayAttr[0] == "foo");
        assert(resObj.aArrayAttr[1] == "bar");

        assert(resObj.aArray.length == 1);
        assert(resObj.aArray[0].aStringInsideOfTheArray == "bar");

        assert(resObj.nested.stuff == "stuff");

        return resObj.aReference.load();
      }).then(function(loadedObj) {
        assert(loadedObj.stuff == "some stuff");

        assert(resObj.aManyReferences.length == 1);

        return resObj.aManyReferences[0].load();
      }).then(function(loadedObj) {
        assert(resObj.aManyReferences[0].ref().stuff == "more stuff");

        done();
      }).done();
    });

  });

  describe('Only save specified attributes', function() {

    var MyModel10 = new model("MyModel10", {
      attr1 : Attr(Types.string),
      nested: {
        stuff : Attr(Types.string),
        unnamed : Attr(Attr.default("unnamed"))
      }
    });
    
    MyModel10.connection(connector);

    it("flat attributes", function(done) {
      var obj = MyModel10.create();
      obj.attr1 = "foo";
      obj.attr2 = "bar";

      obj.save()
        .then(function(resObj) {
          return MyModel10.get(obj._id);
        })
        .then(function(myObj) {
          if (myObj.hasOwnProperty("attr2")) {
            return done("unspecified attribute saved");
          }
          done();
        })
        .done();
    });

    it("attributes in nested objects", function(done) {
      var obj = MyModel10.create();
      obj.nested.stuff = "huuh";
      obj.nested.more = "ohno";

      obj.save()
        .then(function(resObj) {
          return MyModel10.get(obj._id);
        })
        .then(function(myObj) {
          if (myObj.nested.hasOwnProperty("more")) {
            return done("unspecified attribute saved");
          }
          if (myObj.nested.unnamed != "unnamed") {
            return done("attr filter don't work for nested obj")
          }
          done();
        })
        .done();

    });

    it("attribute validation should work", function(done) {
      var obj = MyModel10.create();
      obj.attr1 = 42;
      if (obj.validate("attr1") != "'42' is not a string value") done("Error in validation");
      done();
    });

  });

  describe('Bad Modelizer Usage', function() {
    var MyModel11 = new model("MyModel11", {
      attr1 : Attr(Types.string),
      nested: {
        stuff : Attr(Types.string),
        unnamed : Attr(Attr.default("unnamed"))
      },
      array : [{
          foobar : Attr(Types.string)
       }]
    });

    MyModel11.connection(connector);

    it("should detect overwriting attribute with strange values", function(done) {
      var obj =  MyModel11.create();
      obj.nested = undefined;

      obj.save()
        .then(function(res) {
          done("shouldn't allow save");
        })
        .fail(function(err) {
          if (err.message != "Object attribute 'nested' not provided in your object (model 'MyModel11')") {
            done("Wrong error message");
          } else {
            done();
          }
        });
    });

    it("should detect missing attributes", function(done) {
      var obj =  MyModel11.create();
      obj.nested = { stuff : "foo", unnamed: "bar" };
      delete obj.attr1;

      obj.save()
        .then(function(res) {
          done("shouldn't allow save");
        })
        .fail(function(err) {
          if (err.message != "Attribute 'attr1' not provided in your object (model 'MyModel11')") {
            done("Wrong error message");
          } else {
            done();
          }
        });
    });

    it("should detect missing arrays", function(done) {
      var obj =  MyModel11.create();
      obj.nested = { stuff : "foo", unnamed: "bar" };
      delete obj.array;

      obj.save()
        .then(function(res) {
          done("shouldn't allow save");
        })
        .fail(function(err) {
          if (err.message != "Array 'array' is not correctly provided in your object (model 'MyModel11')") {
            done("Wrong error message");
          } else {
            done();
          }
        });
    });

  });

});
