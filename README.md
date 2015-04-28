# vinyl-elasticsearch

Push Vinyl documents to ElasticSearch.

## Examples

### Saving documents to ES

```javascript
var gulp = require('gulp');

var elasticsearch = require('vinyl-elasticsearch');

gulp.task('default', function (){
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
```

## API

### dest(glob, opt)

The configuration for the connection to ES comes from the `opt` parameter, which is used when creating the client. Possible options are described at [ElasticSearch Configuration](http://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/configuration.html).

The index into which the documents should be saved is specified in the `index` property of either `glob` or `opt`.

The type of the document is set in the `type` property of either `glob` or `opt`. If it's not present then the `base` property of the Vinyl file will be used.

The `id` of the document comes from the `id` property of the Vinyl file, or from `glob` or `opt` if it's not present. If no `id` value is provided then ElasticSearch will create a value automatically.

The body of the document will be set to the `data` property of the Vinyl file if it's present. Otherwise the buffer in the `contents` property will be converted to a string and then parsed as JSON.
