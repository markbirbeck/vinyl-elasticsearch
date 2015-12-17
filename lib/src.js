var _ = require('lodash');
var File = require('vinyl');

var h = require('highland');
var es = require('elasticsearch');

module.exports = function src(glob, _opt) {
  glob = glob || {};

  /**
   * Clone the options because ElasticSearch overwrites them:
   */

  var opt = _.clone(_opt || {});

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

  return (h(client.search(glob)))
    .map(function(data) {
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
    .errors(function(err, rethrow) {
      console.error('[vinyl-elasticsearch]:', err);
      rethrow(new Error('[vinyl-elasticsearch]:', err));
    });
};
