# Modelizer

**The epic ORM-Mapper you want to use for every serious Web-Application. You can access the API directly from your Browser-Code.**

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
var Attr = model.Attr;

// our example model
var UserModel = new model("User", {
  username : Attr(Type.string),
  password : Attr(Type.string)
});
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
    var user = UserModel.create();   // create a new object
    user.username = "test";          // and set some values to the attributes
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
  UserModel.all()
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
> userBob = models.UserModel.create();

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
> models.UserModel.get("52f38e9e842023178c000001")
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


# API

## Defining Models (Schema definition)

Everything in Modelizer starts with a model definition.

### Attributes

The following example shows how define attributes of your model. 

```javascript
// Import Modelizer
var model = require('modelizer');

// The Syntax of how to define a Model
var [A Reference To My Model] = new model("[The Name Of My Model]", {
  [Attribute Name] : Attr([Type Of My Attribute]),
  ...
});

// Example with all available types
var EmployeesModel = new model("Employees", {
  name             : Attr(Type.string),                   // A String like "Tim Jobs"
  age              : Attr(Type.number),                   // A number like 12 or 12.53
  payroll          : Attr(Type.boolean),                  // True or false
  gender           : Attr(Type.enum('male', 'female')),   // Enumeration, ether 'male' or 'female'
  dateOfEmployment : Attr(Type.date),                     // A default JavaScript Date-Object
  nickNames        : Attr(Type.array),                    // JS-Array like: ['Timmy', 'Mr-T', 'The King']
  
  address : {  // a nested object. (a object as an attribute)
    street  : Attr(Type.string),
    eMail   : Attr(myOwnEMailType),                       // You can specify you own types / validators
    country : Attr(Type.string, Attr.default("germany"))  // You can set a default value of a attribute
  },
  
  projects : [{  // an array of nested objects (an array as an attribute)
    name           : Attr(Type.string), 
    identification : Attr(),                              // Anything is allowed: Strings, Numbers even JS-Objects
    budget         : Attr(function (value) {              // Define inline your own validator
      if (value < 0) throw new Error('Budget has to be positive');
      return value;
    })
  }}
});
```

An implicit attribute ```_id``` will be added to every model as a primary key to identity a unique object.
The ```EmployesModel``` will be saved as one document in your mongo-database. You can explicitly define the nested objects if you want to reuses them in different places, as you can see in the following example within ```AdressModel```:

```javascript
// The Address Object from above, explicitly defined
var AddressModel = new model("Address", {
  street  : Attr(Type.string),
  eMail   : Attr(myOwnEMailType),                     
  country : Attr(Type.string, Attr.default("germany"))
});

// The same employees model like above 
var EmployeesModel = new model("Employee", {
  name : Attr(Type.string),
  age  : Attr(Type.number),
  // ..
  
  address : AddressModel,  // explicitly reference to the Address Model  
  // ..
});

```

#### Validators

The type-definitions from the examples above are actually predefined validators shipped within modelizer. In one attribute-definition you can have an arbitrary number of validators. For example you can define an enumeration of the type 'number' and altougth provide a default value. Take a look at this example:

```javascript
var MyModel = new model("MyModel", {
  dice : Attr(Type.number, Attr.enum(1,2,3,4,5,6), Attr.default(6))
});
```

If you want to save ```MyModel``` the value of ```dice``` has to pass all three provided filters. First it will be checked if it is a number. Second ```dice``` has to have one of the values in the enumeration. And the last filter sets the value to the number 6 if nothing is set.

You can write your own filters and type definitions pretty easily. You just have to provide a function that gets the value of the attribute and return the value again. If the value isn't the way you want throw an exception.

This is an example filter which assure that the attribute is not null:

```javascript
// a not null validator
var notNull = function(value) {
  if (value == undefined || value == null)
    throw new Error("it has to be not null!");
  return value;
}

// the usage of the validator is pretty easy
var MyModel = new model("MyModel", {
  myName : Attr(Type.string, notNull)  // use the not null filter
});

```

You can although use a filter to change the value before its stored in the database. The following example changes the sting to uppercase. This is the reason you always have to retun the value in a filter.
```javascript
var uppercase = function(value) {
  assert(typeof value == 'string');
  
  return value.toUpperCase();  // return the string upper cased
}
```

### References

The employee model from the previous chapter still includes everything in one Mongo-Document. There are many good reasons to build relationships between model-entities.  


#### 1:1 Relationships

The following example shows how to build a 1:1-Relation between the Address and Employees-Model. Actually the address-attribute now saves internally a reference-ID to the AdressModel-Object. The key-thing here is the ```Ref()``` for building a directed 1:1-Relationship.

```javascript
var Ref = model.Ref;

// The Model-definition of an Address
var AddressModel = new model("Address", {
  street  : Attr(Type.string),
  eMail   : Attr(myOwnEMailType),                     
  country : Attr(Type.string, Attr.default("germany"))
});

// The Model-definiton of an Employee 
var EmployeesModel = new model("Employee", {
  name : Attr(Type.string),
  age  : Attr(Type.number),
  
  // Using "Ref()" for a 1:1-Relationship that references to the Address Model 
  address : Ref(AddressModel),
});

```

In this way there are two documents saved to mongoDB ```Andress``` and ```Employee```, with employees having a reference to the address-model.

#### 1:N-Relationships

Now let's see how to define a 1:N-Relationship. I'll use the Employees and Projects example from above, defining a 1:N-relationship from projects to employees.

```javascript
var RefArray = model.RefArray;

// The Model-definiton of an employee 
var EmployeesModel = new model("Employee", {
  name : Attr(Type.string),
  age  : Attr(Type.number),
});

// The Model-definition of a project
var ProjectsModel = new model('Project', {
  name    : Attr(Type.string), 
  budget  : Attr(Type.number),
  
  // Using "RefArray" for an 1:N-Relationship with Many-References to the employee model 
  participants : RefArray(EmployeesModel) 
}};

```

Within the Projects-Model there is now the array  ```participants``` with reference-IDs to employee objects.  


### Operation and Factories
A very sexy feature of modelizer is the possibility to define operations for a model. An operation is a function on the model-scope, which can be called from the browser of the client and is implemented and runs on your server. The operation returns everything you want to your client. You never need to implement a REST-Handler for this again :-)

An example usage for this can be stuff like:
* login / register
* or business functions in general

A factory is nearly the same as an operation, but as a result the callier gets one or more objects. In this way you can implement complex search querys or customised result objects.

Example:

```javascript
var Operation = model.Operation;

// The Model-definiton of an employee 
var EmployeesModel = new model("Employee", {
  name  : Attr(Type.string),
  age   : Attr(Type.number),
  eMail : Attr(myOwnEMailType),

  // define an operation
  sendProjectPlanViaMail : Operation(),  // define a business function
  
  // define factories
  getCurrentLoggedinEmployee : Factory(),
  getEmployeesOfProjects : Factory()
});
```

Somewhere in your server you can implement the operations and factories in this way:

```javascript
// This is the implementation of the 'sendProjectPlanViaMail'-Operation
// You can implement your business logic here
EmployeesModel.operationImpl("sendProjectPlanViaMail", function(params, req) {
  // @params: this are the parameter of the client call
  // @req:    access the HTTP-Request see [express API](http://expressjs.com/api.html#req.params) for more information
  //          this is very useful to access the "session" via req.session

  // [Implement logic here] ...

  return result;  // send arbitrary result back to the client
});


// This is an example of a factory implementation
EmployeesModel.factoryImpl("getEmployeesOfProjects", function(params, req) {
  assert(params.hasOwnProperty('name'));  // assure that there is a parameter 'name'
  
  return EmployeesModel.find({name:params.name});  // do complex query and return results to the client ;-)
});
```

## Using objects

What are objects...

create

use foo..

TODO

# Development

TODO

## Testing
=========

You can find the unit- and integration tests in the ```test/``` folder. To run the tests use:

* ```mocha```
* ```karma start test/integration/karma.conf.js```

