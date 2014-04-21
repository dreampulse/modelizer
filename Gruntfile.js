
module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    jshint: {
      // define the files to lint
      files: ['Gruntfile.js', 'src/**/*.js', 'test/**/*.js'],
      // configure JSHint (documented at http://www.jshint.com/docs/)
      options: {
        // more options here if you want to override JSHint defaults
        globals: {
          console: true,
          module: true
        }
      }
    },

    clean: {
      build: {
        src: ["./browser-dist"]
      }
    },

/*  // currently there is no need for that
    copy: {
      main: {
        expand : true,
        cwd: 'src/',
        src: ['model.js', 'modelizer.js', 'microlibs.js', 'modelizer-client.js', 'angular-client.js'],
        dest: 'lib/',
        options: {
          mode: '0444'  // remove write permission (so you can't change generated code)
        }
      }
    },
*/
    watch: {
      files: ['<%= jshint.files %>'],
      tasks: ['build']
    },

    mochaTest: {
      test: {
        options: {
          reporter: 'spec'
        },
        src: ['test/*.js']
      }
    },

    karma: {
      client: {
        configFile: './test/integration/karma-client-connector.conf.js',
        singleRun: true
      },
      angular: {
        configFile: './test/integration/karma-angular-connector.conf.js',
        singleRun: true
      }//,
//      phantom : {
//        configFile: './test/integration/karma-client-connector.conf.js',
//        singleRun: true,
//        browsers: ['PhantomJS']
//      }
    },

    // browserify ./lib/modelizer-client.js -r ./lib/modelizer-client:modelizer -r q -o ./browser-dist/modelizer.js
    // browserify ./lib/angular-client.js -r ./lib/angular-client:modelizer -r q -o ./browser-dist/modelizer-angular.js
    browserify: {
      client : {
        src : './lib/modelizer-client.js',
        dest : './browser-dist/modelizer.js',
        options: {
          require : ['q'],
          alias: ['./lib/modelizer-client:modelizer', 'objectid-browser:./objectid']
        }
      },
      angular : {
        src : './lib/angular-client.js',
        dest : './browser-dist/modelizer-angular.js',
        options: {
          require : ['q'],
          alias: ['./lib/angular-client:modelizer', 'objectid-browser:./objectid']
        }
      }
    }

  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-karma');
  grunt.loadNpmTasks('grunt-release');
  grunt.loadNpmTasks('grunt-npm-install');

  grunt.registerTask('build', ['clean', 'browserify']);
  grunt.registerTask('dist', ['npm-install', "build"]);

  // this would be run by typing "grunt test" on the command line
  grunt.registerTask('test', ['build', 'mochaTest', 'karma']);
  //grunt.registerTask('test', ['jshint', 'mochaTest']);

  // the default task can be run just by typing "grunt" on the command line
  //grunt.registerTask('default', ['jshint', 'mochaTest', 'copy']);
  grunt.registerTask('default', ['dist', 'mochaTest']);

}

