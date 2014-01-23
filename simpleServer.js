/**
 * Created with JetBrains WebStorm.
 * User: jonathan
 * Date: 23.01.14
 * Time: 10:44
 * To change this template use File | Settings | File Templates.
 */

// http://stackoverflow.com/questions/16333790/node-js-quick-file-server-static-files-over-http

var connect = require('connect'),
  directory = __dirname,
  port = 3000;

connect()
  .use(connect.logger('dev'))
  .use(connect.static(directory))
  .listen(port);

console.log('Listening on port ' + port);