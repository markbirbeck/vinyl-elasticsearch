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
    .consume(function(error, file, push, next) {
      if (error) {
        push(error);
        next();
      } else if (file === h.nil) {
        push(null, file);
      } else {
        if (!(file.data || file.contents)) {
          console.error('No content to index!', file);
          push(null, file);
          next();
        } else {
          var req = {
            index: glob.index || opt.index,
            type: glob.type || opt.type || file.data.type || file.base,
            id: file.id || file.path || glob.id || opt.id,
            body: file.data || JSON.parse(file.contents.toString())
          };

          client.index(req, function(error, response) {
            if (error) {
              console.error('Error writing to ES:', file.data, error);
              push(error);
            } else {
              push(null, file);
            }
            next();
          });
        }
      }
    })

    .resume()
    ;

  return stream;
};

