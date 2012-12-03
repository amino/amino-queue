var hydration = require('hydration')
  , amqp = require('amqp')

exports.attach = function (options) {
  var amino = this
    , client
    , ready = false

  options || (options = {});
  options.queue || (options.queue = {durable: true, autoDelete: true});

  client = amqp.createConnection(options);
  client.setMaxListeners(0);

  client.on('error', amino.emit.bind(amino, 'error'));
  client.on('ready', function () {
    ready = true;
  });

  amino.queue = function (queue, data) {
    if (ready) doQueue();
    else client.once('ready', doQueue);

    function doQueue () {
      try {
        if (typeof data === 'object') {
          data = hydration.dehydrate(data);
        }
        data = JSON.stringify(data);
        client.queue(queue, options.queue, function (q) {
          client.exchange().publish(queue, data);
        });
      }
      catch (e) {
        amino.emit('error', e);
      }
    }
  };

  amino.process = function (queue, cb) {
    if (ready) doProcess();
    else client.once('ready', doProcess);

    function doProcess () {
      client.queue(queue, options.queue, function (q) {
        q.subscribe({ack: true}, function (message, headers, deliveryInfo) {
          try {
            var data = message.data.toString();
            data = JSON.parse(data);
            if (typeof data === 'object') {
              data = hydration.hydrate(data);
            }
          }
          catch (e) {
            return amino.emit('error', e);
          }

          cb(data, function (err) {
            if (err) {
              amino.emit('error', err);
            }
            q.shift();
          });
        });
      });
    }
  };
};