# Modelizer

**The epic ORM-Mapper you want to use for every Web-Application**

You can access the Model-API directly from your JavaScript-Client and from the Node.js-Server in the same way. Modelizer has a very strong filter based security API, so that you can decide which objects can be accessed in which way from the client. Alongside Modelizer generates a beautiful REST-API.

Modelizer was designed as a very thin layer which can fit seamlessly in your  software architecture. All examples show how perfect MongoDB, express and AngularJS fits together. 

Currently Modelizer is in Alpha-Stage, so the API could change at any time. If you're interested to support us or need support using Modelizer doesn’t  hesitate to write an E-Mail.

## Installation

Install [node.js](http://nodejs.org/) and [mongodb](http://www.mongodb.org/downloads) and
get modelizer with npm: 

    $ npm install modelizer


## Usage
Create at least three files for model, view and the controller (server)

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



## Sample Usage

Define the folowing model and save it to ```models.js```:

```javascript
// using the the Modelizer library
var model = require('modelizer');
var Attr = model.Attr;
var Type = model.Attr.Types;


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


// export as a node module
module.exports = {
  UserModel : UserModel,
};

```

Now we take a short look how to use the model.
Open a node-shell with ```node```.
First let's initialize some stuff:

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

Now you are ready to have some fun with modelizer :-)

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
You can use this object like any other javascript object.
```javascript
userBob.email = "bob@bobsworld.com";
userBob.profile.firstName = "Bob";
userBob.enabled = true;
```
When you're ready you can save the object to mongodb by using the save()-function:
```javascript
userBob.save();
```

Let's take a look inside the database, so that you can see the result. Connect to the database (```mongo myExampleDB```) and print all User-Documents (```db.User.find().pretty()```). The result should look something like this:

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

You can load stored objects from the database using the ObjectId from above.
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
Functions to receive stored objects are part of the model (eg. ```UserModel```). Take a look to the API-Reference for further information.
You may notice that the API is completely promise based. Modelizer uses ```kriskowal/q```. You can find the API-Documentation [here](http://documentup.com/kriskowal/q/). 



# Development

TODO

## Testing
=========
- ```mocha```
- ```karma start karma.conf.js```

