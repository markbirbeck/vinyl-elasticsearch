'use strict';
var util = require('util');
var _ = require('lodash');

var h = require('highland');
var elasticsearch = require('elasticsearch');

let manageTemplate = require('./manageTemplate');

module.exports = function dest (glob, _opt) {
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

  return h.pipeline(function(stream) {
    var _stream = (opt.rateLimit) ? stream.ratelimit(1, opt.rateLimit) : stream;
    var client = new elasticsearch.Client(_.clone(opt));

    return _stream
      .through(manageTemplate.stream(_.clone(opt)))

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
          index: glob.index || file.index || opt.index,
          type: glob.type || (file.data && file.data.type) ||
            opt.type || file.base,
          id: glob.id || file.id || file.path || opt.id,
          body: file.data || JSON.parse(file.contents.toString())
        };
      })

      /**
       * Now push each new object to ES:
       */

      .map(function(file) {
        client.index(file, function(error, response) {
          if (error) {
            if (error.message.indexOf('Request Timeout after') > -1) {
              console.warn(util.format('[vinyl-elasticsearch]: %s', error));
            } else {
              throw new Error(util.format('[vinyl-elasticsearch]: %s %s %s', file,
                error, response));
            }
          }
        });
        return file;
      });
  });
};
