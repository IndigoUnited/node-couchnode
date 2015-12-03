'use strict';

var expect     = require('expect.js');
var bucket     = require('../../../index').wrap(require('../bucket'));
var throwError = require('../throwError');

// ----------------------------------------------------------------------------

module.exports  = function () {
    it('return same instance if wrapping an instance of Bucket', function (done) {
        expect(require('../../../index').wrap(bucket)).to.be(bucket);

        return done();
    });

    it('should limit the amount of parallel read & write ops', function (done) {
        this.timeout(60000);

        var initialMaxReadsPerOp  = bucket.maxReadsPerOp;
        var initialMaxWritesPerOp = bucket.maxWritesPerOp;

        bucket.maxReadsPerOp  = 2500;
        bucket.maxWritesPerOp = 500;

        var tuples = {};

        for (var i = 1; i <= 20000; i++) {
            tuples['key' + i] = 'foo';
        }

        var keys = Object.keys(tuples);

        bucket.upsert(tuples, function (err) {
            throwError(err);

            bucket.get(keys, function (err) {
                throwError(err);

                bucket.remove(keys, function (err) {
                    throwError(err);

                    // restore initial values
                    bucket.maxReadsPerOp  = initialMaxReadsPerOp;
                    bucket.maxWritesPerOp = initialMaxWritesPerOp;

                    return done();
                });
            });
        });
    });
};
