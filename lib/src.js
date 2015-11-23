var _ = require('lodash');
var File = require('vinyl');

var h = require('highland');
var es = require('elasticsearch');

module.exports = function src(glob, opt) {
  glob = glob || {};
  opt = opt || {};

  /**
   * Return a pipeline for use in non-Highland situations:
   */

  return h.pipeline(function(stream) {
    var client = new es.Client(_.clone(opt));

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
