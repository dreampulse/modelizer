/**
 * Created by jonathan on 29.04.14.
 */

// Philosphie:
// - Object als eine Einheit behandeln

// definition of an interface (object API)


collection.add();

collection.on(); // change


var obj = myModel.create();  // new object
obj.foo = 34;
obj.save();

// server

myModel.onCreate(theObject);
myModel.onChange(theObject);
myModel.onDelete(theObject);

myModel.find({}) // -> ist ne subView (subset)
myModel.get() // -> ein el

myModel.view('byArea', {box:[]})  // ->  enspricht der Factory (result hat gleiches schema) (subset) -> selection (in db-theorie)


// ich brauch aufm server nicht ne kopie von ner collection sonder brauch die collection


// client
$scope.myModel = {};
$scope.myModel = myModel.collection();
myModel.select('byArea', {box:[]}).bind($scope.myModel);
$scope.myModel = myModel.select('byArea', params_key);
$scope.myModel = myModel.select.byArea(params);


myModel.define.select.byArea = function(params) {

};

// model definieren können

// ich will objecte erstellen / changen / deleten können
// ich will ein object (+incl Änderungen) verwenden können (read)
// ich will (views / selections) an ein angular model binden können

// ich will aufm server selections filtern können
