
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

    copy: {
      main: {
        expand : true,
        cwd: 'src/',
        src: '*.js',
        dest: 'lib/'
      }
    },

    watch: {
      files: ['<%= jshint.files %>'],
      tasks: ['jshint']
    },

    mochaTest: {
      test: {
        options: {
          reporter: 'spec'
        },
        src: ['test/*.js']
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-mocha-test');

  // this would be run by typing "grunt test" on the command line
  grunt.registerTask('test', ['copy', 'mochaTest']);
  //grunt.registerTask('test', ['jshint', 'mochaTest']);

  // the default task can be run just by typing "grunt" on the command line
  //grunt.registerTask('default', ['jshint', 'mochaTest', 'copy']);
  grunt.registerTask('default', ['copy', 'mochaTest']);

}

