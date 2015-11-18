var util = require('util');
var _ = require('lodash');

var h = require('highland');
var elasticsearch = require('elasticsearch');

module.exports = function dest (glob, opt) {
  glob = glob || {};
  opt = opt || {};

  /**
   * Return a pipeline for use in non-Highland situations:
   */

  return h.pipeline(function(stream) {
    var _stream = (opt.rateLimit) ? stream.ratelimit(1, opt.rateLimit) : stream;
    var client = new elasticsearch.Client(_.clone(opt));

    return _stream
      /**
       * Ensure there is some data to index:
       */

      .filter(function(file) {
        return file.data || file.contents;
      })

      /**
       * Change the layout and use default values where necessary:
       */

      .map(function(file) {
        return {
          index: opt.index || file.index || glob.index,
          type: opt.type || (file.data && file.data.type) ||
            glob.type || file.base,
          id: opt.id || file.id || file.path || glob.id,
          body: file.data || JSON.parse(file.contents.toString())
        };
      })

      /**
       * Now push each new object to ES:
       */

      .map(function(file) {
        client.index(file, function(error, response) {
          if (error) {
            throw new Error(util.format('Error writing to ES: %s %s %s', file,
              error, response));
          }
        });
        return file;
      });
  });
};
