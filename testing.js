// Wie das Modell genutzt wird (von beiden Seiten)

var ObjectId = require('mongojs').ObjectId;

var models = require('./model.shared.js');
models.StammdatenModel.use.all().then(function(o){objs = o;});

var foo = models.StammdatenModel.createObject();
foo.name = "foo";

foo.participants.createObject();
foo.participants.ref[0]().street = "matthias";
foo.participants.ref[0]().save();
foo.save();


foo.store.createObject();
foo.store.ref().fileSize = 0815;
foo.store.ref().save();
foo.save();


//foo.name = "Array Test";
//foo.createAddressElement();
//foo.address[0].street = "Home Street";
//foo.save();


models.StammdatenModel.use.all().then(function(o){objs = o;});

//foo.save();
//models.StammdatenModel.use.all();
//var bar = models.PlanModel.createObject();
//
//bar.participants.createObject();
//bar.participants.ref[0].name = "user1";
//bar.participants.ref[0].save()
//bar.save();
//
//foo.createAddressElement();
//foo.save();


// todo: ich muss definieren können was ein Object für methoden anbietet

// todo: ich muss classen und objectmodell nachbauen