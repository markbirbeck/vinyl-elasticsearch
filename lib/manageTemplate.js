'use strict';
let path = require('path');

let _ = require('lodash');
let retry = require('retry');
let es = require('elasticsearch');

function createTemplate(client, templateName, templateDir, overwrite) {
  let fn = (resolve, reject) => {
    let params = {name: templateName};

    return client.indices.existsTemplate(params)
    .then(exists => {
      if (!exists || overwrite) {
        params.body = require(path.join(templateDir, templateName + '.json'));

        client.indices.putTemplate(params)
          .then(() => resolve(true))
          .catch(err => {
            reject(new Error(`Failed writing template '${templateName}': ${err}`));
          });
          ;
      } else {
        resolve(false);
      }
    })
    .catch(err => {
      reject(new Error(`Failed checking if template '${templateName}' exists: ${err}`));
    });
  }

  return new Promise(fn);
}

function faultTolerantCreateTemplate(client, templateName, templateDir, overwrite, retries) {
  let fn = (resolve, reject) => {
    let opts;

    /**
     * Default to no retries rather than 10 (the module's default):
     */

    opts = {retries: retries || 0};

    let operation = retry.operation(opts);

    operation.attempt(currentAttempt => {
      createTemplate(client, templateName, templateDir, overwrite)
      .then(resolve)
      .catch(err => {
        if (!operation.retry(err)) {
          if (currentAttempt >= retries) {
            reject(err);
          }
        }
      })
      ;
    });
  };

  return new Promise(fn);
}

module.exports = _opts => {
  let manageTemplate = (resolve, reject) => {
    let opts = _.clone(_opts);
    let manageTemplate = (!('manageTemplate' in opts) || opts.manageTemplate);

    if (!manageTemplate) {
      resolve(false);
    } else {
      if (opts.amazonES) {
        opts.connectionClass = require('http-aws-es');
      }

      let client = new es.Client(opts);

      opts.templateName.split(/\s*,\s*/).forEach(name => {
        faultTolerantCreateTemplate(client, name, opts.templateDir,
          opts.templateOverwrite, opts.retries)
        .then(resolve)
        .catch(reject)
        ;
      });
    }
  }

  return new Promise(manageTemplate);
}
