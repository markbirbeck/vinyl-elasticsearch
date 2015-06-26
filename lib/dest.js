var through2 = require('through2');
var elasticsearch = require('elasticsearch');

module.exports = function dest (glob, opt){

  opt = opt || {};

  var client = new elasticsearch.Client( opt );

  return through2.obj(function(file, enc, cb){

    if (file.data || file.contents) {
      var data = file.data || JSON.parse(file.contents.toString());
      var req = {
        index: glob.index || opt.index,
        type: glob.type || opt.type || data.type || file.base,
        id: file.id || glob.id || opt.id,
        body: data
      };

      client.index(req, function(error /*, response*/) {
        if (error) {
          return cb(error);
        } else {
          return cb(null, file);
        }
      });
    } else {
      return cb();
    }
  });
};
