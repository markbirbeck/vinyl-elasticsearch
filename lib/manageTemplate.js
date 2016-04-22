'use strict';
let path = require('path');
let h = require('highland');

let _ = require('lodash');
let retry = require('retry');
let es = require('elasticsearch');

/**
 * Keep track of whether the template has been written for a particular index:
 */

let doneTemplateCache = {};

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
            reject(new Error(`Failed writing template '${templateName}': ${err.message}`));
          });
          ;
      } else {
        resolve(false);
      }
    })
    .catch(err => {
      reject(new Error(`Failed checking if template '${templateName}' exists: ${err.message}`));
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

    operation.attempt(() => {
      createTemplate(client, templateName, templateDir, overwrite)
      .then(resolve)
      .catch(err => {
        if (!operation.retry(err)) {
          reject(err);
        }
      })
      ;
    });
  };

  return new Promise(fn);
}

let promise = _opts => {
  let manageTemplate = (resolve, reject) => {
    let opts = _.clone(_opts);
    if (!opts.manageTemplate) {
      resolve(false);
    } else {
      if (opts.amazonES) {
        opts.connectionClass = require('http-aws-es');
      }

      let client = new es.Client(opts);

      if (!opts.templateName) {
        reject(new Error('Missing templateName parameter'));
      } else {
        opts.templateName.split(/\s*,\s*/).forEach(name => {
          faultTolerantCreateTemplate(client, name, opts.templateDir,
            opts.templateOverwrite, opts.retries)
          .then(resolve)
          .catch(reject)
          ;
        });
      }
    }
  }

  return new Promise(manageTemplate);
};

let stream = function(_opts) {
  console.log(`[vinyl-elasticsearch]: creating manage template stream`);
  ['manageTemplate', 'templateName', 'templateOverwrite', 'templateDir']
  .forEach(setting => {
    console.log(`[vinyl-elasticsearch]: manage template option '${setting}': ${_opts[setting]}`);
  });

  return s => {
    return s.consume((err, x, push, next) => {
      if (err) {
        push(err);
        next();
      }
      else if (x === h.nil) {
        push(null, x);
      }
      else {
        /**
         * If the template has already been written then just pass the data
         * through:
         */

        if (doneTemplateCache[x.index]) {
          push(null, x);
          next();
        }

        /**
         * If the template has not been written then do it before writing the
         * current record:
         */

        else {
          console.log(`[vinyl-elasticsearch]: template to be written for index ${x.index}`);

          /**
           * Time how long it takes to write the template:
           */

          let timeKey = `[vinyl-elasticsearch]: manage template for index ${x.index}`;

          console.time(timeKey);

          /**
           * Set the flag early so that nothing else tries to write the
           * template:
           */

          doneTemplateCache[x.index] = true;
          promise(_opts)
          .then(() => {
            console.timeEnd(timeKey);
            push(null, x);
            next();
          })
          .catch(err => {

            /**
             * If writing the template fails then undo the flag:
             */

            doneTemplateCache[x.index] = false;
            push(new Error(`manageTemplate failed: ${err.message}`));
            next();
          })
          ;
        }
      }
    })
    ;
  }
};

module.exports = {
  promise,
  stream
};
