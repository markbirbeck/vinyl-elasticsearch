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

  if (opts.amazonES) {
    opts.connectionClass = require('http-aws-es');
  }

  /**
   * Return a pipeline for use in non-Highland situations:
   */

  return h.pipeline(function(stream) {
    var client = new es.Client(opt);

    client.search(glob)
    .then(function(data) {
      var file = new File({
        contents: new Buffer(JSON.stringify(data))
      });

      file.data = data;
      file.stat = {
        size: file.contents.length
      };
      stream.write(file);
    })
    .catch(function(err) {
      console.error('Error reading from ElasticSearch:', err);
      throw new Error('Error reading from ElasticSearch:', err);
    });

    return stream;
  });
};
