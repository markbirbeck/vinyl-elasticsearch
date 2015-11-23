/**
 * Run this from the root with:
 *
 *  gulp --cwd example/
 */

var gulp = require('gulp');
var h = require('highland');

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

function echo(file) {
  return h()
    .each(function(file) {
      console.log('[ECHO]: ', file.id || file.path || 'no id or path',
        file.data || String(file.contents));
    });
}

gulp.task('search', function() {
  return elasticsearch.src(
    {
      index: process.env.ELASTICSEARCH_INDEX,
      size: 0,
      body: {
        // Begin query.
        query: {
          // Boolean query for matching and excluding items.
          bool: {
            must: [{match: {'organization': '/Organizaton/rayder'}}]
          }
        },
        // Aggregate on the results
        aggs: {
          actions: {
            terms: {
              field: 'additionalType',
              order: {'_term' : 'asc'},
              size: 10,
            }
          }
        }
      }
    },
    {
      host: process.env.ELASTICSEARCH_HOST,
      log: 'trace'
    }
  )
    .pipe(echo());
});
