
/****************
 ** BOTH ********
 ****************/

// Der Code steht sowohl im client wie auch aufm server zur Verfügung

var model = require('./lib/model');
var Type = model.Type;

// Methoden arbeiten auf einem Object
// Operationen arbeiten auf dem Modell (quasi static method)

var AmazonStoreModel = new model("AmazonStore")
    .attr("fileSize", Type.int)
    .attr("fileName", Type.string)
    .method("createSignedUploadURL")
  ;

var UserModel = new model("User")
    .attr("firstName", Type.string)
    .attr("lastname", Type.string)
    .attr("eMail", eMailValidator)
    .attr("password", Type.string)
    .setter("password")
    .method("resetPassword")
    .operation("isEmailAvailableForLoginaccount")
    .operation("currentUser")
  ;

var PlanModel = new model("Plan")
    .attr("planName", Type.string)
    .attrRef("owner", UserModel)                    // eine id die aufs UserModel verweist
    .attrRefArray("participants", UserModel)        // eine 1:N-Relation
    .attrObj("file", AmazonStoreModel)              // inline Object
  ;



UserModel.setterImpl("password", function(password) {
  //generate encrypted password method
  // ...
  return "X234XZ"
});

var eMailValidator = function(eMail) {
  if (!Type.string(eMail)) return false;
  return UserModel.isEmailAvailableForLoginaccount();  // alternativ exceptions mit Fehlerbeschreibung
}

module.exports = {
  AmazonStore : AmazonStoreModel,
  User : UserModel,
  Plan : PlanModel
};


/***************
 ** SERVER *****
 ***************/

// Der code ist nur auf dem Server

var model = require('./model.js');

// lesen und schreiben darf nur der Besitzer
model.User.readWriteFilter(function (user, req) {
  // user ist das user-object
  // req ist der express-request (user._id wird von passport gesetzt)
  return (req.user._id === user.eMail)
});

model.Plan.readWriteFilter(function (plan, req) {
  return (req.user._id === plan.owner)
});


model.User.operationImpl("currentUser", function(User, req) {
  return User.useFiltered.find({ eMail : req.user._id })
    .then(function(user) {
      return user;
    });
});



/***************
 ** CLIENT *****
 ***************/

// so funktioniert der Zugriff

var models = require('./model.js');


models.User.currentUser()
  .then(function(user){

    user.firstName = "Jonathan";
    user.password = "geheim";

    return user.save();
  })
  .then(function(user) {
    user.resetPassword();  // methoden hängen an dem Object
    return user.save();
  });

models.PlanModel.all()
  .then(function(plans){
    console.log(plans);  // alle Pläne auf die der Benutzer Zugriff hat werden zurückgegeben

    _.for(plans, function(plan) {
      console.log(plan.file.fileName);

    });

  });


models.PlanModel.find({ planName : "Mein Plan" })
  .then(function(plan) {
    // ..
  });

models.User.isEmailAvailableForLoginaccount()  // operation die am Modell hängt
  .then(function(res) {
    //..
  });

