var through2 = require('through2');
var elasticsearch = require('elasticsearch');

module.exports = function dest (glob, opt){

  opt = opt || {};

  var client = new elasticsearch.Client( opt );

  return through2.obj(function(file, enc, cb){

    if (file.contents) {
      var req = {
        index: glob.index || opt.index,
        type: glob.type || opt.type || file.base,
        id: file.id || glob.id || opt.id,
        body: file.data || JSON.parse(file.contents.toString())
      };

      client.index(req, function(error, response) {
        if (error) {
          return cb(error);
        } else {
          return cb(null, file);
        }
      });
    }
  });
};
