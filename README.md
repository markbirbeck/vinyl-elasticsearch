# vinyl-elasticsearch

Read and write Vinyl documents from and to ElasticSearch.

## Examples

### Reading documents from ES

```javascript
var gulp = require('gulp');

var elasticsearch = require('vinyl-elasticsearch');

gulp.task('search', function() {
  return elasticsearch.src(
    {
      index: 'someindex',
      size: 0,
      body: {
        // Begin query.
        query: {
          // Boolean query for matching and excluding items.
          bool: {
            must: [{match: {'somefield': 'somevalue'}}]
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
      host: 'https://localhost:9200',
      log: 'trace'
    }
  )
    .pipe(echo());
});
```

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

### Options

The configuration for the connection to ES comes from the `opt` parameter, which is used when creating the client. Possible options are described at [ElasticSearch Configuration](http://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/configuration.html).

In addtion to the ElasticSearch options, a few more have been added to help manage templates, use the AWS version of ElasticSearch, and to configure retries.

#### Managing Templates

If `opt.manageTemplate` is `true`, then templates will be maintained automatically on the ElasticSearch host. This involves checking for one or more templates with the names indicated in `templateName`, and if they don't exist (or the `templateOverwrite` value is set to `true`) then the appropriate template from the `templateDir` is uploaded. If any of these parameters are missing then errors will be propagated back to the caller.

For example:

```json
{
  templateName: 'logstash,listenaction',
  templateOverwrite: true,
  templateDir: path.join(__dirname, '../fixtures/templates')
}
```

#### Using the AWS Version of ElasticSearch

In addition, if `opt.amazonES` is present then each message is signed. This makes it possible to use Amazon's ElasticSearch Service. Possible values for `amazonES` are:

```json
"amazonES": {
  "region": "someregion",
  "accessKey": "accesskeyid",
  "secretKey": "secretaccesskey"
}
```

#### Configuring Retries

Some ElasticSearch actions may fail for reasons that are temporary, such as servers being busy with nightly backups, or network failures. To help deal with this `opts.retries` can be set to indicate the number of retries, with the default being zero.

The retry strategy uses the [retry module](https://www.npmjs.com/package/retry) and the backoff strategy is [described there](https://www.npmjs.com/package/retry#tutorial).

### dest(glob, opt)

The configuration for the connection to ES comes from the `opt` parameter, as described above.

The index, document type and id are usually derived from the `file` object being passed through, using:

* the `file.index` value;
* the `file.type` value, of if none is present, the `file.base` value;
* the `file.id` value, or if none is present the `file.path` value.

For any of these values that is not present the corresponding value from `opt` will be used.

However, to make it possible to override values across the board, any settings in `glob` take priority.

The body of the document will be set to the `data` property of the Vinyl file if it's present. Otherwise the buffer in the `contents` property will be converted to a string and then parsed as JSON.

### src(glob, opt)

The configuration for the connection to ES comes from the `opt` parameter, as described above.

The document returned will be the whole collection of search results, with the usual `hits.hits` incantation. This will probably be modified soon to allow individual results to be returned as distinct Vinyl files.
