'use strict';
var util = require('util');
var _ = require('lodash');

var h = require('highland');
var elasticsearch = require('elasticsearch');

let manageTemplate = require('./manageTemplate');

module.exports = (glob, _opt) => {
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

  return h.pipeline(stream => {
    var client = new elasticsearch.Client(_.clone(opt));

    /**
     * The first part of the pipeline applies rate limiting (if necessary)...
     */

    var _stream = ((opt.rateLimit) ? stream.ratelimit(1, opt.rateLimit) : stream)

    /**
     * ...checks that there is some data to process...
     */

    .filter(file => file.data || file.contents)

    /**
     * ...and sets up ES values such as index and type.
     */

    .map(file => ({
        index: glob.index || file.index || opt.index,
        type: glob.type || (file.data && file.data.type) ||
          opt.type || file.base,
        id: glob.id || file.id || file.path || opt.id,
        body: file.data || JSON.parse(file.contents.toString())
      })
    )
    ;

    /**
     * The next part of the pipeline comprises two forks, one for indexing
     * each record and one for writing the templates.
     *
     * The indexing stream:
     */

    var indexingStream = _stream
    .fork()

    /**
     * Batch up the items to be indexed, either by size (say, 5000
     * of them) or by time (however many have arrived in a certain
     * amount of time, say 5s):
     */

    .batchWithTimeOrCount(+(opt.batchTimeout || 5000), +(opt.batchSize || 5000))

    /**
     * Map each insert to two records for the bulk API:
     */

    .map(batch => {
      let bulkActions = [];

      batch.forEach(file => {
        bulkActions.push({
          index: {
            _index: file.index,
            _type: file.type,
            _id: file.id
          }
        });
        bulkActions.push(file.body);
      });

      return bulkActions;
    })

    /**
     * Do the bulk API insert:
     */

    .consume((err, bulkActions, push, next) => {
      if (err) {
        push(err);
        next();
        return;
      }

      if (bulkActions === h.nil) {
        push(null, h.nil);
        return;
      }

      let timeKey = `[vinyl-elasticsearch]: written ${bulkActions.length / 2} records on ${_opt.host}: took`;

      console.time(timeKey);
      client.bulk({body: bulkActions}, function(error, response) {
        if (error) {
          if (error.message.indexOf('Request Timeout after') > -1) {
            console.warn(util.format('[vinyl-elasticsearch]: %s', error));
          } else {
            throw new Error(util.format('[vinyl-elasticsearch]: %s %s %s', bulkActions,
              error, response));
          }
        }

        /**
         * Log the time taken:
         */

        console.timeEnd(timeKey);
        push(null, bulkActions);
        next();
      });
    })
    ;

    /**
     * The template fork of the stream simply inserts a template into ES
     * as necessary:
     */

    _stream
    .fork()
    .through(manageTemplate.stream(_.clone(opt)))
    .resume()
    ;

    return indexingStream;
  });
};
