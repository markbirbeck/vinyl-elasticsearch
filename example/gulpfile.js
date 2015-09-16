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
          index: 'someindex',
          type: 'somedoc'
        },
        {
          host: 'https://localhost:9200',
          log: 'trace'
        }
      )
    );
});
