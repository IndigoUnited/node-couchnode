'use strict';

var expect     = require('expect.js');
var throwError = require('../throwError');
var bucket     = require('../../../index').wrap(require('../bucket'));
var keys       = require('../fixtures').keys;

// ----------------------------------------------------------------------------

module.exports  = function () {
    it('should increment a key', function (done) {
        bucket.counter('counter', 5, function (err) {
            throwError(err);

            bucket.get('counter', function (err, res) {
                throwError(err);

                expect(res.value).to.be(keys.counter + 5);

                return done();
            });
        });
    });
};
