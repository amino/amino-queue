var hydration = require('hydration')
  , amqp = require('amqp')

exports.attach = function (options) {
  var amino = this
    , client
    , queueDefaults = {}
    , ready = false

  options || (options = {});
  options = extend({ heartbeat: 25 }, options);
  queueDefaults = extend({ durable: true, autoDelete: true }, options.queue);
  delete options.queue;

  client = amqp.createConnection(options);
  client.setMaxListeners(0);

  client.on('error', amino.emit.bind(amino, 'error'));
  client.on('ready', function () {
    ready = true;
  });

  amino.queue = function (queue, options, data) {
    if (arguments.length < 3) {
      data = options;
      options = {};
    }
    if (ready) doQueue();
    else client.once('ready', doQueue);

    function doQueue () {
      try {
        if (typeof data === 'object') {
          data = hydration.dehydrate(data);
        }
        data = JSON.stringify(data);
        client.queue(queue, extend({}, queueDefaults, options), function (q) {
          client.exchange()
            .on('error', amino.emit.bind(amino, 'error'))
            .publish(queue, data);
        }).on('error', amino.emit.bind(amino, 'error'));
      }
      catch (e) {
        amino.emit('error', e);
      }
    }
  };

  amino.process = function (queue, options, cb) {
    if (arguments.length < 3) {
      cb = options;
      options = {};
    }
    if (ready) doProcess();
    else client.once('ready', doProcess);

    function doProcess () {
      client.queue(queue, extend({}, queueDefaults, options), function (q) {
        q.on('error', amino.emit.bind(amino, 'error'))
         .subscribe({ack: true}, function (message, headers, deliveryInfo) {
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
      }).on('error', amino.emit.bind(amino, 'error'));
    }
  };

  amino.queue.exists = function (queue, options, cb) {
    if (arguments.length < 3) {
      cb = options;
      options = {};
    }
    if (ready) doExists();
    else client.once('ready', doExists);

    function doExists () {
      client.queue(queue, extend({ passive: true }, queueDefaults, options), function (q) {
        cb(null, q);
      }).on('error', cb);
    }
  };

  amino.queue.destroy = function (queue, opts) {
    // Without options, the queue will be deleted even if it has pending
    // messages or attached consumers. If opts.ifUnused is true, then the queue
    // will only be deleted if there are no consumers. If opts.ifEmpty is true,
    // the queue will only be deleted if it has no messages.
    opts = opts || {};

    if (ready) doDestroy();
    else client.once('ready', doDestroy);

    function doDestroy () {
      client.queue(queue, { noDeclare: true }, function (q) {
        q.on('error', amino.emit.bind(amino, 'error'))
         .destroy(opts);
      }).on('error', amino.emit.bind(amino, 'error'));
    }
  };

  // Expose the client
  // E.g., now you can gracefully shutdown:
  // app.amino.queue._client.end();
  amino.queue._client = client;
};

// Adapted from Underscore.js
function extend (obj) {
  [].slice.call(arguments, 1).forEach(function (source) {
    if (source) {
      for (var prop in source) {
        // Treat these objects like simple hashes
        if (source.hasOwnProperty(prop)) {
          obj[prop] = source[prop];
        }
      }
    }
  });
  return obj;
}
