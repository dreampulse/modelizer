require('./model.shared')


/*
  todo: model implementiert eine abstrakte read und write funktion
  der Mongo store implementiert diese
  und die filter werden vor jedem read/ write angewandt
 */

StammdatenModel.readFilter(function (model, user) {
  return { "userId" : user.userId};
});

StammdatenModel.writeFilter(function(model, user) {
  return user == model.userId
});




StammdatenModel.operationImpl("resetPassword", function(model, user) {

});

