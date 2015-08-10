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
      if (!(file.data || file.contents)) {
        console.log('No content to index!', file);
        push(null, file);
      } else {
        var req = {
          index: glob.index || opt.index,
          type: glob.type || opt.type || file.data.type || file.base,
          id: file.id || file.relative || glob.id || opt.id,
          body: file.data || JSON.parse(file.contents.toString())
        };

        client.index(req, function(error, response) {
          if (error) {
            console.log('Error writing to ES:', file, error);
            push(error);
          } else {
            console.log('Written:', file, 'to ES:', response);
            push(null, file);
          }
          next();
        });
      }
    })

    .resume()
    ;

  return stream;
};

