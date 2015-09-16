var util = require('util');

var h = require('highland');
var elasticsearch = require('elasticsearch');

module.exports = function dest (glob, opt) {
  var stream = h();
  var _stream = stream;
  opt = opt || {};

  var client = new elasticsearch.Client(opt);

  if (opt.rateLimit) {
    _stream = stream.ratelimit(1, opt.rateLimit);
  }

  _stream

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
        index: glob.index || opt.index,
        type: glob.type || opt.type || (file.data && file.data.type) ||
          file.base,
        id: file.id || file.path || glob.id || opt.id,
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
    })

    /**
     * Doesn't feel right to have to do this, but no other way to get things
     * going:
     */

    .resume()
    ;

  return stream;
};
