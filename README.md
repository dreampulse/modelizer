# Modelizer

An Idea how to share a model between client, server and database


## Usage

Get modelizer with npm:  ```npm install modelizer```

Create at least tree files for model, view and the controller (server)

### Model
Putting the model to the heart of your application is one of the main concepts for the modelizer.
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
  <script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/angularjs/1.2.9/angular.min.js"></script>

  <!-- The Modelizer Library -->
  <!-- If you use the sampleServer this is the way to load the library -->
  <script type="text/javascript" src="modelizer.js"></script>

  <!-- The definitions of our example model -->
  <script type="text/javascript" src="models.js"></script>

  
  <!-- This is an example how to use the model from the client / view -->
  <script type="text/javascript">
    var connector = Model.AngularConnector("http://localhost:8080/");   // use the AngularConnector to access the server
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



## Testing
=========
- ```mocha```
- ```karma start karma.conf.js```

