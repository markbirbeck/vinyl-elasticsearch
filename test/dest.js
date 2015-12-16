'use strict';
let path = require('path');
require('chai').should();
let h = require('highland');
let _ = require('lodash');
let uut = require('../lib/dest');

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

describe('dest', function() {

  /**
   * NOTE: The following test can pass successfully, but won't tell us when it
   * has failed, other than by timing out. It's better than having no tests at
   * all.....
   */

  this.timeout(10000);

  it('manageTemplate fails when missing templateName parameter', function(done) {
    let opt = _.clone(_opt);

    /**
     * Delete the template name to force an error:
     */

    delete opt.templateName;

    h([
      {hello: 'world'},
      {hello: 'world1'},
      {hello: 'world2'},
      {hello: 'world3'}
    ])
    .through(uut({}, opt))
    .stopOnError(err => {

      /**
       * Ensure we get an error message:
       */

      err.should.be.an('Error');
      err.message.should.equal('manageTemplate failed: Missing templateName parameter');
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
});
