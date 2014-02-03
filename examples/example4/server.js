'use strict';

// The Modelizer library
var model = require('../../lib/modelizer.js');
model.runSampleServer(__dirname, 8080, 'mongodb://127.0.0.1/example');

// importing our defined models
require('./models.js');


