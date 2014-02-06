# Modelizer

An Idea how to share a model between client, server and database



## Installation

Install [node.js](http://nodejs.org/) and [mongodb](http://www.mongodb.org/downloads) and
get modelizer with npm: 

    $ npm install modelizer


## Usage
Create at least tree files for model, view and the controller (server)

### Model
Putting the model to the heart of your application is one of the main concepts for modelizer.
The Model is the central interface between the view and the controller

- The ```models.js``` file for a very simple example model definition

```javascript
var model = require('modelizer');   // using the the Modelizer library
var Type = model.Attr.Types;        // import type definitions


// our example model
var UserModel = new model("User")
  .attr("username", Type.string)
  .attr("password", Type.string)
;
```


### Server

- The ```server.js``` file:

```javascript
// using the the Modelizer library
var model = require('modelizer');

// Setup a express server at port 8080,
// Serving all files at __dirname
// and connect to the example database at localhost
model.runSampleServer(__dirname, 8080, 'mongodb://127.0.0.1/example');

// importing our model definitions
var myModels = require('./models.js');
```

### View

- The ```index.html``` file: 

```html
...
<head>
  <!-- External Library -->
  <!-- You need to inclue AnguarJS and the Q-Library -->
  <script type="text/javascript" src="//cdnjs.cloudflare.com/ajax/libs/q.js/1.0.0/q.min.js"></script>
  <script type="text/javascript" src="//ajax.googleapis.com/ajax/libs/angularjs/1.2.9/angular.min.js"></script>

  <!-- The Modelizer Library -->
  <!-- If you use the sampleServer this is the way to load the library -->
  <script type="text/javascript" src="modelizer.js"></script>

  <!-- The definitions of our example model -->
  <script type="text/javascript" src="models.js"></script>

  
  <!-- This is an example how to use the model from the client / view -->
  <script type="text/javascript">
    // Define how to access the model (using AngularConnector to a remote model)
    var connector = Model.AngularConnector("http://localhost:8080/");
    UserModel.connection(connector);   // use the connector for the example Model

    // example Usage
    var user = UserModel.createObject();   // create a new object
    user.username = "test";                // and set some values to the attributes
    user.password = "secret";

    // save data to server
    user.save().done();

  </script>

</head>
...
```

### Explore
To get hands on the model just open the javascript-debugging-console in your browser. And try this:

```javascript
  UserModel.use.all()
    .then(function(objs){
      console.log(objs);
    }).done()
```



## Sample

Define a model as shown in the folowing example and save it to ```models.js```

```javascript
// using the the Modelizer library
var model = require('modelizer');
var Attr = model.Attr;
var Type = model.Attr.Types;
var Ref = model.Ref;


// The "User" model
var UserModel = new model("User", {
  email : Attr(Type.string),  // define a string attribute this way

  // to nest and group some attributes use this syntax 
  profile : {
    firstName : Attr(Type.string),
    lastName : Attr(Type.string),
    company : Attr(Type.string, Attr.default('n/a'))  // set a default value
  },

  enabled : Attr(Type.boolean),

  billing : {
    // enumerations
    interval : Attr(Type.string, Type.enum('monthly', 'annually')),
    plan : Attr(Type.string, Type.enum('small', 'medium', 'large'))
  }

});

// The "Project" model
var ProjectModel = new model("Project", {
  title : Attr(Type.string),

  // An array of multible values with the folowing schema
  participants : [{
    user : Ref(UserModel),  // A reference to the User-Model
    roles : Attr(Type.array),  // A array with a single value
    permission : Attr(Type.string, Type.enum('owner', 'participant'))
  }]

});

// export as a node module
module.exports = {
  UserModel : UserModel,
  ProjectModel : ProjectModel
};

```

Now take a look how you can use the model. Open a node-shell and init some stuff.

```javascript
// first load modelizer and the model definition
var modelizer = require('modelizer');
var models = require('./models');


// init a mongodb database connection
var mongojs = require('mongojs');
var db = mongojs('mongodb://127.0.0.1/myExampleDB');

// tell modelizer to use this connection to store the models
var connector = modelizer.MongoConnector(db);  // get a mongodb database connector
models.UserModel.connection(connector);
models.ProjectModel.connection(connector);
```

You're done now. Let's have some fun with modelizer :-)

```javascript
// create your fist Object
> userBob = models.UserModel.createObject();

// now the shell should promt the following result:
{ email: undefined,
  enabled: undefined,
  profile: 
   { firstName: undefined,
     lastName: undefined,
     company: undefined },
  billing: { interval: undefined, plan: undefined },
  save: [Function] }
```
you can use this object like any other javascript object
```javascript
userBob.email = "bob@bobsworld.com";
userBob.profile.firstName = "Bob";
userBob.enabled = true;
```
when you're ready you can save the mongodb by using the save()-function
```javascript
userBob.save();
```

If you take a look in the database you can see the result
Connect to your database ```mongo myExampleDB``` and print the document ```db.User.find().pretty()```. The result should look someting like this:

```javascript
{
	"email" : "bob@bobsworld.com",
	"enabled" : true,
	"profile" : {
		"firstName" : "Bob",
		"lastName" : null,
		"company" : "n/a"
	},
	"billing" : {
		"interval" : null,
		"plan" : "large"
	},
	"_id" : ObjectId("52f38e9e842023178c000001")
}
```

You can load the object from the database using the ObjectId.
Functions to get and search objects are part of the model.
```javascript
> models.UserModel.use.get("52f38e9e842023178c000001")
     .then(function(obj){
        console.log(obj);
     });
```
The result will be this:
```javascript
{ email: "bob@bobsworld.com",
  enabled: true,
  profile: { firstName: "Bob", lastName: null, company: "n/a" },
  billing: { interval: null, plan: "large" },
  save: [Function],
  remove: [Function],
  _id: 52f38e9e842023178c000001 }
```


# Development
## Testing
=========
- ```mocha```
- ```karma start karma.conf.js```

