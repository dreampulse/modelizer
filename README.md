# Modelizer

**The epic ORM-Mapper you want to use for every serious Web-Application. You can access the API directly from your Browser-Code.**

## Highlights

* Write your data-model code only once and access the SAME model on the client and the server
* Node.js technology
* Auto-generated REST-API and ajax-calls
* Filter-based Security
* Promise based API (Promises/A+)

You can access the Model-API directly from your JavaScript-Client and from the Node.js-Server in the same way. Modelizer has a very strong filter-based security-API, so you can decide which objects can be accessed in which way from the client. Alongside Modelizer generates a beautiful REST-API.

Modelizer was designed as a very thin layer which fits seamlessly in your software architecture. It only depends on MongoDB, you can chosse the the middleware and frontend technoloy you like best. For the examples we use MongoDB, express, and AngularJS (MEAN-Stack).

Currently, Modelizer is in Alpha-Stage, so the API could change at any time. If you're interested to support us or need support using Modelizer don't hesitate to write an E-Mail (modelizer@dreampulse.de).

## Installation

Install [node.js](http://nodejs.org/) and [mongodb](http://www.mongodb.org/downloads) and
get modelizer with npm: 

    $ npm install modelizer


## Usage
Create at least three files for model, view and the controller (server)

### Model
Putting the model at the heart of your application is one of the main concepts for modelizer.
With Modelizer the data-model becomes the central interface between the view and the controller.

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

The server exposes the model.js to the client via simple JavaScript file inclusion:
```
<script type="text/javascript" src="models.js"></script>
```
- The ```server.js``` file:

```javascript
// using the the Modelizer library
var model = require('modelizer');

// Setup a express server at port 8080,
// Serving all files at __dirname (current working directory)
// and connect to the example database at localhost
model.runSimpleServer(__dirname, 8080, 'mongodb://127.0.0.1/example');

// importing our model definitions
var myModels = require('./models.js');
```



### View

- The ```index.html``` file: 

```html
...
<head>
  <!-- The Modelizer Library -->
  <!-- If you use the sampleServer this is the way to load the library -->
  <script type="text/javascript" src="modelizer.js"></script>

  <!-- The definitions of our example model -->
  <script type="text/javascript" src="models.js"></script>

  
  <!-- This is an example how to use the model from the client / view -->
  <script type="text/javascript">
    // Define how to access the model (using AngularConnector to a remote model)
    var connector = Model.ClientConnector("localhost", 8000);
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



## A Quick Tour

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
// create your first Object
> userBob = models.UserModel.create();

// now the shell should print out the following result:
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
var EmployeeModel = new model("Employee", {
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
  }]
});
```

An implicit attribute ```_id``` will be added to every model as a primary key to identity a unique object.
The ```EmployesModel``` will be saved as one document in your mongo-database. You can explicitly define the nested objects if you want to reuse them in different places, as you can see in the following example within ```AdressModel```:

```javascript
// The Address Object from above, explicitly defined
var AddressModel = new model("Address", {
  street  : Attr(Type.string),
  eMail   : Attr(myOwnEMailType),                     
  country : Attr(Type.string, Attr.default("germany"))
});

// The same employees model like above 
var EmployeeModel = new model("Employee", {
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

You can although use a filter to change the value before its stored in the database. The following example changes the string to uppercase. This is the reason you always have to retun the value in a filter.
```javascript
var uppercase = function(value) {
  assert(typeof value == 'string');
  
  return value.toUpperCase();  // return the string upper cased
}
```

### References

The employee model from the previous chapter still includes everything in one Mongo-Document. There are many good reasons to build relationships between model-entities. But remeber that nosql-databases to not guarantee integrety between documents! 


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

In this way there are two documents saved to mongoDB ```Anddress``` and ```Employee```, with employees having a reference to the address-model.

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
});

```

Within the Projects-Model there is now the array  ```participants``` with reference-IDs to employee objects.  

#### Links (to subdocuments)

Sometimes you need to link inside to specific document. Especially if you use nesed objects. Take a look at the folowing model:

```javascript

var Car = new model("Cars", {
  brand : Attr(Types.string),  // like 'A-Class', or Audi 'A8'
  moreStuff : Attr(Types.string)
});

// Vendors of some cars
var Vendor = new model("Vendors", {
  name : Attr(Types.string),  // name of a vendor like: Daimler, or BMW

  cars : ObjArray(Cars)  // <-- an array of many objects
});

// the Cars of my garage
var MyCar = new model("MyCars", {
  vendor : Ref(Vendor),
  car : Link(Vendor, Car)  // <- this is a link to a object (Car) inside of a model (Vendor)
});

```

Now create some objects, ahh.. I mean cars ;-)

```javascript
var myGolf = MyCar.create();

var vendor = myGolf.vendor.create();
vendor.name = "Volkswagen";
var car = vendor.createCars();
car.brand = "Golf";

// now set the link to the object 
myGolf.car.set(vendor, car);

// you can now access you Car-Object via:
myGolf.car.ref();  // -> returns a Car-Object 

```

If you recive a objec you need to init the link manually:

```javascript
var myGolf;
MyCar.get([id of a car]).then(function(car) {
  myGolf = car;
  return car.vendor.load();  // load the referenced object
}).then(function(vendor){

  myGolf.car.init(vendor);  // <- this is the way to init a link
  
  // ...
});

```

### Operation and Factories
A very sexy feature of modelizer is the possibility to define operations for a model. An operation is a function on the model-scope, which can be called from within the client app and is implemented and runs on your server. The operation returns everything you want to your client. You never need to implement a REST-Handler for this again :-)

An example usage for this can be stuff like:
* login / register
* or business logic functions in general

A factory is nearly the same as an operation, but as a result the caller gets one or more objects. In this way you can implement complex search queries or customized result objects.

Example:

```javascript
var Operation = model.Operation;
var Factory = model.Factory;

// The Model-definiton of an employee 
var EmployeesModel = new model("Employee", {
  name  : Attr(Type.string),
  age   : Attr(Type.number),
  eMail : Attr(myOwnEMailType),

  // define an operation
  assotiateWithDifferentDepartment : Operation(),  // define a business function
  
  // define factories
  getCurrentLoggedinEmployee : Factory(),
  getEmployeesOfProjects : Factory()
});
```

Somewhere in your server you can implement the operations and factories in this way:

```javascript
// This is the implementation of the 'assotiateWithDifferentDepartment'-Operation
// You can implement your business logic here
EmployeesModel.operationImpl("assotiateWithDifferentDepartment", function(params, req) {
  // @params: this are the parameter of the client call
  // @req:    access the HTTP-Request see [express API](http://expressjs.com/api.html#req.params) for more information
  //          this is very useful to access the "session" via req.session

  // [Implement logic here] ...

  return result;  // send arbitrary result back to the client
});


// This is an example of a factory implementation
EmployeesModel.factoryImpl("getEmployeesOfProjects", function(params, req) {
  assert(params.hasOwnProperty('name'));  // assure that there is a parameter 'name'
  
  return EmployeesModel.find({name:params.name});  // do complex query ;-)
});
```

## Using objects

Now that you know how to create models you although need to know how to create or instantiate an object from this model.
You can do this with the ```create()```-function of your model-definition.

The object that will be created is a pretty ordinary JavaScript-Object. The object will have the attributes you have specified at your model-definition, preinitialized with ```null```. Further more the object has two extra functions: ```save()``` to presently save the object as a document in your database. And a ```remove()```-function to remove the document from the database (you will still have a local object).

Open an interactive node-console and follow this example:

```javascript
> var model = require('modelizer');  // Import Modelizer
> var Attr = model.Attr;             // Import some shortcuts
> var Type = model.Attr.Types;

// initialze the database connection
> var mongojs = require('mongojs');
> var db = mongojs('mongodb://127.0.0.1/test');
> var connector = model.MongoConnector(db);


// This is our model
> var myModel = new model('MyModel', {
...   attr1 : Attr(Type.string),
...   attr2 : Attr(Type.string)
... });

// tell our model to use the database connection from above
> myModel.connection(connector);


// now create a object out of your model
> obj = myModel.create();   // <----- this is the way how to create a object
  { attr1: null,
    attr2: null,
    save: [Function],
    remove: [Function] }

// you can set values to you attributes
> obj.attr1 = 'A value for attr1';
> obj.attr2 = 'and more for attr2';

// now store the object to the database
> obj.save()

// type now 'obj'
// you have now one more attribute '_id'
> obj
{ attr1: 'A value for attr1',
  attr2: 'and more for attr2',
  save: [Function],
  remove: [Function],
  _id: 5307268e11e70038f7000001 }

```

### Validators in action

Now let's see what happens if we try to save a not-string-value to ```myModel```:

```javascript
> obj.attr1 = 42;  // ups, not a string ;)

> obj.save().done();  // save it again and then.... ups ;-)
/Users/jonathan/Projects/modelizer/node_modules/q/q.js:126
                    throw e;
                          ^
Error: Can't save 'attr1' '42' is not a string value
    at Object.Model.Attr.Types.string [as 0] (/Users/jonathan/Projects/modelizer/lib/modelizer.js:1247:13)
    ...

```

Now you get a nice exception when trying to save an invalid value. But what is this ```.done()``` thing? Take a look at the next chapter.

### Promises

As already mentioned Modelizer is completely promised-based. The reason for this is quite simple: Every interaction between the database, the client and the server takes some time. And to avoid blocking-IO-calls you have to do something. The default approach in the JavaScript-Word is to use callback-functions, but this sucks. There are a few approaches in the JS-World how to deal with this problem in a better way and one of this are [Promises](http://documentup.com/kriskowal/q/). 
This is a better way to save the object, because you can react according to the result:

```javascript
> obj.save()
... .then(function(obj) {  // the then function will be called if everything was successful
...   console.log('save was performed successfully');
... })
... .fail(function(err) {  // the failed will be called if something went wrong
...   console.log('save failed', err);
... })

// you'll see the following result
  save failed [Error: Can't save 'attr1' '42' is not a string value]

```

### Using nested- and array of nested objects

Assuming that you have defined the EmployeesModel from above:

```javascript
var EmployeeModel = new model("Employee", {
  name : Attr(Type.string),
  // ...
  address : {  // a nested object. (a object as an attribute)
    street  : Attr(Type.string),
    eMail   : Attr(Type.string),                       
    country : Attr(Type.string)
  },
  
  projects : [{  // an array of nested objects (an array as an attribute)
    name           : Attr(Type.string), 
    identification : Attr(Type.string),
    budget         : Attr(Type.string)
  }]
});
```

Then you can use nested objects as you would expect:

```javascript
> obj = EmployeesModel.create();  // create Employee object

// set values of nesed objects
> obj.address.street = "My street";
> obj.address.country = "germany";
```

Modelizer has a special helper function to create new elements for a nested object, if it is an array:
```javascript
> obj = EmployeesModel.create();  // create Employee object

> var project = obj.createProjects();  // create a new project

// access the attributes of the nested object
> project.name = "write documentation for modelizer";
> project.budget = "zero";
```

The name of this helper method is dynamically created according to the name of the attribute. The name for the method to create a object for a nested array element is always: ```create[name of the attribute]()```, with the first letter of the attribute in upper-case.

A nested array is nothing specially you can treat it like any normal JavaScript-Array:
```javascript
// push a new element
> obj.project.push({
...   name   : 'big project',
...   budget : '10000 EUR'
... });

// change a value
obj.project[0].budget = "0 EUR";
```

### Using references / (1:1)-Relation

I assume that you have defined the following model:

```javascript
// The Model-definition of an Address
var AddressModel = new model("Address", {
  street  : Attr(Type.string),
  eMail   : Attr(Type.string),                     
  country : Attr(Type.string, Attr.default("germany"))
});

// The Model-definiton of an Employee 
var EmployeesModel = new model("Employee", {
  name : Attr(Type.string),
  age  : Attr(Type.number),
  
  address : Ref(AddressModel),  // a reference to the AddressModel
});

```

Create an objet from the model, so that we can take a look at the functions:
```javascript
// create a new employee object
> var employee = EmployeesModel.create()
{ name: null,
  age: null,
  address: 
   { create: [Function],
     setObject: [Function] },
  save: [Function],
  remove: [Function] }
```

References (without an object) provide two functions:
* ```create()```: to create a new object of the referenced type
* ```setObject(obj)```: if you already have a object you can use this method to assign the object to this reference

If you have assigned an object to the reference there are two additional functions avaiable:
* ```load()```: to load (or reload) the object from the database 
* ```ref()```: to obtain the referenced object

Now we create an address object. A reference to this object is automatically saved to the employee-object:
```javascript
// create a new address object
> var addr = employee.address.create();

> addr.street  = "unfashionable end of the western spiral arm";
> addr.country = "the galaxy";  // ;-)

> addr.save().done();  // save it
```

You can now access the address-object via the ```ref()```-function:
```javascript
> employee.address.ref()
{ street: 'unfashionable end of the western spiral arm',
  eMail: null,
  country: 'the galaxy',
  save: [Function],
  remove: [Function],
  _id: 5307405b8499298bf7000001 }
```

When you save the employee object, an ```_reference```-attribute will be stored. Take a look:
```javascript
> employee.save().done()
> employee
{ name: null,
  age: null,
  address: 
   { create: [Function],
     load: [Function],
     setObject: [Function],
     ref: [Function],
     _reference: 5307405b8499298bf7000001 },  // <-- reference-id to an address object
  save: [Function],
  remove: [Function],
  _id: 530741268499298bf7000002 }
```

### Using array of references / (1:N)-Relation

I assume that you have defined the flowing models:

```javascript
var EmployeesModel = new model("Employee", {
  name : Attr(Type.string),
  age  : Attr(Type.number),
});

var ProjectsModel = new model('Project', {
  name    : Attr(Type.string), 
  budget  : Attr(Type.number),
  
  participants : RefArray(EmployeesModel)  // <-- a array of references to employee objects 
});
```

Now we will create a project object:

```javascript
> var project = ProjectsModel.create();  // create a new project
> project
{ name: null,
  budget: null,
  participants: [],
  createParticipants: [Function],
  save: [Function],
  remove: [Function] }

```

We have now an empty array of participants. Modelzier has automatically defined a function to create a new reference (```create[name of the reference]()```). The elements of the 'participants'-array will have the same functions like a 1:1-Reference from above. Take a look at this example:

```javascript
> var employee = project.createParticipants();  // create new object and reference

> var employee = project.participants[0].ref()  // get the object
```

## Find and receive objects

At this point you know everything about how to create and save objects. In this chapter you'll learn how to find and receive objects from the database/server.

### Get all objects
Every model provide a ```all()```-function. With this function you can recveice all objects. The promise will resolve with an array of result objects.

Example:
```javascript
> EmployeesModel.all()  // get all objects
... .then(function(employees) {  // employees will be an array of all Emplyee-objects
...   console.log(employees);
... });
```

### Get an object by id
To get a certain object us the ```get(id)``` or ```findById(id)``` function. The promise will resolve with the result object or reject (call ```fail()```) if there is not such an object. 

Example:
```javascript
> EmployeesModel.get("530741268499298bf7000002")  // get the object with that id
... .then(function(employee) {  // employees is the Emplyee-objects
...   console.log(employee);
... })
... .fail(function(err) {
...   console.log("Didn't find that employee, because:", err);
... });
```

### Find objects by an query
If you want to perform a more complex search you can use ```find(query)```and ```findOne(query)```. The syntax of the search is the [mongoDB-query API](http://docs.mongodb.org/manual/tutorial/query-documents/). The result aren't just documents like in other ORMs (e.g. Mongoose). You'll receive true Modelizer-objects :-)

Example:
```javascript
> EmployeesModel.find({name:"Tim Jobs"})  // the query
... .then(function(employees) {
...   console.log(employees)
... });
```

### Call an operation or a factory

Calling those is very obviously:

```javascript
> EmployeeModel.sendProjectPlanViaMail().done();
```

If you want to pass parameters you have to encapsulate them in an object:

```javascript
> EmployeeModel.getEmployeesOfProjects({name:"Project Modelizer"})
... .then(function(employees) { ... });
```

## Functions for collections

When you have a reference to a set of Modelizer-Objects (you get them via ```all()``` or ```find(query)```) you have two additional functions avaiable:
* ```create()``` : create a new instance and add the object to the collection
* ```save()``` : save all object at once


## Security concept (read-/write filters)

Now you are ready to use Modelzier in full splendor. But there is one more thing :-) You don't actually want that everyone can access all your objects from the whole internet. It may even depend on some states if you want to allow a client (a user) to access some parts of you models. How can you achieve this? With modelizer this is very easy.

You can define a filter for each model. A read and write request (this happens e.g. when you call ```save()``` for an object) has to pass all filters. Every filter can remove objects depending on some state.

Let's take a look at a simple example:
```javascript
// add a filter to the Employee model
// every read request has to pass the filter
EmployeeModel.readFilter(function (req) {
  return true;  // this means: filter has passed -> everyone can read anything
});

// add a write filter to the Employee model
EmployeeModel.writeFilter(function(obj, req) {
   return false;  // this means: passing filter faild -> no one can write anything
});
```

By the way, the default setting is: everyone can read/write anything. And yes I know this in bad idea and I promise I will change this soon! :-)

Let's take a look at a slightly more complex example. With a boolean-result you can globally allow or deny the access to all objects of the model. If you want to allow the access to some objects (a subset of all objects) you can use a mongo-query to cut some objects out of the result.

```javascript
EmployeeModel.readFilter(function (req) {
  // this means: everyone can read only employees with budget below 10000
  return {"projects.budget" : { "$lt": 10000 } };
});
```

This is quite powerful but this becomes really handy if you construct the result depending on some state. Let's assume that you have variable called 'session.currentUser' set somewhere else. Then your filter could look like this, and allow a user only to access his 'Employee'-object:
```javascript

var session;
//..

EmployeeModel.readFilter(function (req) {
  return {"name" : session.currentUser };  // select a subset of objects (eg. the objects with {name: "John", ..})
});
```

### Session handling

In every read- and write you can access a session store via ```req.session``` this feature is actually a feature from [express](http://expressjs.com/api.html#cookieSession). You can simply store anything below ```req.session``` and the framework will care for everything else. 


### Example register and login implementation

With everything you have now in your hands it should be very easy to implement some login-/ register functionality. So let's do it and use this model as an example:

```javascript
// The Model-definition on register and login 
var EmployeeModel = new model("Employee", {
  username : Attr(Type.string),
  password : Attr(Type.string),
  
  stuff    : Attr(Type.string),
  
  register : Operation(),  // register a new user
  login    : Operation()   // perform a login
});
```
First let's implement a register operation. This operation creates a new employee object and saves it to the database.

```javascript
// register registers (creates) a new employee
EmployeeModel.operationImpl("register", function(params, req) {
  var employee = EmployeeModel.create({
    username : params.username,
    password : params.password
  });
});
```

Second let's implement a login operation. This operations searches for the user and checks if the password is correct. The interesting part is storage of the username in ```req.session.username```.

```javascript
EmployeeModel.operationImpl("login", function(params, req) {
  EmployeeModel.findOne( { username : params.username } )  // search for the user in the database
    .then(function(obj) {
      if (obj.password == params.password) {     // check if the password is correct

	// store the username in the session
        req.session.username = obj.username;
      }
    })
});
```

From now on we can check the current user by reading from the ```req.session.username```-variable. So let's now setup the read- and write filters:

```javascript
// read filter
EmployeeModel.readFilter(function (req) {
  if (!req.session.username) return false;  // if no one has called login() before, deny acceess
  
  return {username : req.session.username };  // only allow the user to read this documents
});

// write filter
EmployeeModel.writeFilter(function (req) {
  if (!req.session.username) return false;    // if no one has called login() before, deny acceess
  return {username : req.session.username };  // only allow the user to read this documents
});

```

That's it! :-)

From a client you can now login an access your own employee information:
```javascript
// if you try to access the employee model without a login, a exception will be thrown
EmployeeModel.all().done();

Q()
.then(function() {  // first register
  return EmployeeModel.register({username:"Jonathan", password:"XXX"});
})
.then(function() {  // if sucessfull perform login
  return EmployeeModel.login({username:"Jonathan", password:"XXX"});
})
.then(function() {  // get all employees objects
  return EmployeeModel.all();  // now it will work
})
.then(function(employees) {
  assert(employees.length == 1);  // i should only get one result (my object)
  
  employees.stuff = "...";
  //...
});
```

## Further examples

For more examples take a look in the folder ```examples/```
(examples are outdated)

# Development

Run ```grunt``` to build browser distribution libs.

If you want to join our development team or if you have suggestions/feature requests write a mail :-)

## Testing
=========

You can find the unit- and integration tests in the ```test/``` folder. To run the tests use:

* ```mocha``` or
* ```grunt test``` to run unit- and integration tests


