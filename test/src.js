'use strict';
let path = require('path');
require('chai').should();
let _ = require('lodash');
let uut = require('../lib/src');

let _opt = {
  host: process.env.ELASTICSEARCH_HOST,
  amazonES: {
    region: process.env.ELASTICSEARCH_AWS_DEFAULT_REGION,
    accessKey: process.env.ELASTICSEARCH_AWS_ACCESS_KEY_ID,
    secretKey: process.env.ELASTICSEARCH_AWS_SECRET_ACCESS_KEY
  },
  retries: 2,
  manageTemplate: true,
  templateName: 'testTemplate',
  templateOverwrite: true,
  templateDir: path.join(__dirname, '../fixtures/templates')
};

describe('src', function() {

  /**
   * NOTE: The following test can pass successfully, but won't tell us when it
   * has failed, other than by timing out. It's better than having no tests at
   * all.....
   */

  this.timeout(10000);

  it('should propagate error when host invalid', done => {
    let opt = _.clone(_opt);

    /**
     * Create an invalid host:
     */

    opt.host += 'x';

    uut({query: 'who cares...it\'s not used anyway'}, opt)
    .stopOnError(err => {

      /**
       * Ensure we get an error message:
       */

      err.should.be.an('Error');
      err.message.should.contain('No Living connections');
    })
    .toArray(xs => {

      /**
       * Ensure there is no data:
       */

      xs.should.have.length(0);
      done();
    })
    ;
  })

  it('should query', done => {
    let opt = _.clone(_opt);

    uut({
      index: 'logstash-*',
      body: {
        query: {
          match: {
            '_id': 'a08bec48-3058-4f3f-aba0-7f027f8259c4-1447336627-playbackStarted'
          }
        }
      }
    }, opt)
    .toArray(xs => {
      let hits = xs[0].data.hits.hits;

      /**
       * Ensure there is one record:
       */

      hits.should.have.length(1);
      hits[0].should.have.property('_type', 'ListenAction');
      done();
    })
    ;
  })
});
