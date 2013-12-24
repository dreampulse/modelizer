// Wie das Modell genutzt wird (von beiden Seiten)

var models = require('./model.shared.js');
var foo = models.StammdatenModel.createObject();
foo.userId = "foo";

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