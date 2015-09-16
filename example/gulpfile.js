/**
 * Run this from the root with:
 *
 *  gulp --cwd example/
 */

var gulp = require('gulp');

var elasticsearch = require('../');

gulp.task('default', function() {
  return gulp.src('hello.json')
    .pipe(
      elasticsearch.dest(
        {
          index: process.env.ELASTICSEARCH_INDEX,
          type: 'somedoc'
        },
        {
          host: process.env.ELASTICSEARCH_HOST,
          log: 'trace'
        }
      )
    );
});
