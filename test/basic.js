describe('basic test', function () {
  it('should only receive from the subscribed queue', function (done) {
    var left = 4;
    var beatles = ['Ringo', 'John', 'Paul', 'George'];
    amino.queue('u2', 'Bono');
    amino.queue('jimi', 'Hendrix');
    amino.queue('mamas', 'Cass');
    amino.queue('beatles', 'John');
    amino.queue('beatles', 'George');
    amino.queue('cream', 'Eric');
    amino.queue('beatles', 'Paul');

    amino.process('beatles', function (data, next) {
      if (inArray(data, beatles)) {
        if (!--left) {
          done();
        }
      }
      else {
        assert.fail(data, beatles, 'Name not in list', 'in');
      }
      next();
    });

    amino.queue('beatles', 'Ringo');
  });

  it('should be able to handle objects', function (done) {
    amino.queue('jazz', {name: 'Bill Evans'});

    amino.process('jazz', function (data, next) {
      assert.strictEqual(data.name, 'Bill Evans', 'Object property can be accessed');
      done();
    });
  });

  it('can check that a queue exists', function (done) {
    amino.queue.exists('beatles', function (err, q) {
      assert.ifError(err);
      amino.queue.exists('u2', function (err, q) {
        assert.ifError(err);
        amino.queue.exists('jimi', function (err, q) {
          assert.ifError(err);
          amino.queue.exists('mamas', function (err, q) {
            assert.ifError(err);
            amino.queue.exists('cream', function (err, q) {
              assert.ifError(err);
              amino.queue.exists('jazz', function (err, q) {
                assert.ifError(err);
                amino.queue.exists('DNE', function (err, q) {
                  assert(err instanceof Error);
                  done();
                });
              });
            });
          });
        });
      });
    });
  });

  it('should be able to destroy the queues', function (done) {
    amino.queue.destroy('beatles');
    amino.queue.destroy('u2');
    amino.queue.destroy('jimi');
    amino.queue.destroy('mamas');
    amino.queue.destroy('cream');
    amino.queue.destroy('jazz');
    setTimeout(done, 250);
  });

});