var _ = require('lodash');
var File = require('vinyl');

var h = require('highland');
var es = require('elasticsearch');

module.exports = (glob, _opt) => {
  glob = glob || {};

  /**
   * Clone the options because ElasticSearch overwrites them:
   */

  var opt = _.clone(_opt || {});

  /**
   * Allow for a list of hosts:
   */

  if (opt.host && typeof(opt.host) === 'string') {
    opt.host = opt.host.split(',');
  }

  /**
   * If the caller is hoping to use AWS ElasticSearch rather than a
   * direct instance then insert the signing module:
   */

  if (opt.amazonES) {
    opt.connectionClass = require('http-aws-es');
  }

  /**
   * Return a pipeline for use in non-Highland situations:
   */

  var client = new es.Client(opt);

  /**
   * Create a thenless search...the 'then()' will be provided by highland:
   */

  var search = client.search(glob)
      .catch(err => {
        throw new Error('[vinyl-elasticsearch]:' + err.message);
      })
      ;

  return (h(search))
    .map(data => {
      var file = new File({
        path: data._id || 'noid',
        contents: new Buffer(JSON.stringify(data))
      });

      file.data = data;
      file.stat = {
        size: file.contents.length
      };
      return file;
    })
    ;
};
