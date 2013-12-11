// Wie das Modell genutzt wird (von beiden Seiten)

var models = require('./model.shared.js');
var foo = models.StammdatenModel.createObject();
foo.userId = "foo";
foo.save();
models.StammdatenModel.use.all();
var bar = models.PlanModel.createObject();

foo.createAddressElement();
foo.save();


// todo: ich muss definieren können was ein Object für methoden anbietet

// todo: ich muss classen und objectmodell nachbauen