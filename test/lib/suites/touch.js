'use strict';

var expect     = require('expect.js');
var throwError = require('../throwError');
var bucket     = require('../../../index').wrap(require('../bucket'));
var keys       = require('../fixtures').keys;

// ----------------------------------------------------------------------------

module.exports  = function () {
    it('should touch a single key', function (done) {
        this.timeout(3000);

        bucket.touch('a', 1, function (err, res, misses) {
            throwError(err);

            expect(misses.length).to.be(0);
            expect(res.a).to.be.ok();

            setTimeout(function () {
                bucket.get('a', function (err, res, misses) {
                    expect(res.a).to.be(undefined);
                    expect(misses).to.contain('a');

                    return done();
                });
            }, 2000);
        });
    });

    it('should touch multiple keys', function (done) {
        this.timeout(3000);

        bucket.touch(['a', 'b', 'c'], 1, function (err, res, misses) {
            throwError(err);

            expect(misses.length).to.be(0);
            expect(res.a).to.be.ok();
            expect(res.a).to.be.ok();
            expect(res.a).to.be.ok();

            setTimeout(function () {
                bucket.get(['a', 'b', 'c'], function (err, res, misses) {
                    expect(res.a).to.be(undefined);
                    expect(res.b).to.be(undefined);
                    expect(res.c).to.be(undefined);
                    expect(misses).to.contain('a');
                    expect(misses).to.contain('b');
                    expect(misses).to.contain('c');

                    return done();
                });
            }, 2000);
        });
    });

    it('should return a miss when touching a single non-existing key', function (done) {
        bucket.touch('non-existing-key', 1, function (err, res, misses) {
            throwError(err);

            expect(misses).to.contain('non-existing-key');
            expect(res['non-existing-key']).to.not.be.ok();

            return done();
        });
    });

    it('should return misses when getting and touching multiple non-existing keys', function (done) {
        this.timeout(3000);

        bucket.touch(['non-existing-key-1', 'non-existing-key-2', 'non-existing-key-3', 'a', 'b', 'c'], 1, function (err, res,  misses) {
            throwError(err);

            expect(misses).to.contain('non-existing-key-1');
            expect(misses).to.contain('non-existing-key-2');
            expect(misses).to.contain('non-existing-key-3');
            expect(res['non-existing-key-1']).to.not.be.ok();
            expect(res['non-existing-key-2']).to.not.be.ok();
            expect(res['non-existing-key-3']).to.not.be.ok();

            setTimeout(function () {
                bucket.get(['a', 'b', 'c'], function (err, res, misses) {
                    expect(res.a).to.be(undefined);
                    expect(res.b).to.be(undefined);
                    expect(res.c).to.be(undefined);
                    expect(misses).to.contain('a');
                    expect(misses).to.contain('b');
                    expect(misses).to.contain('c');

                    return done();
                });
            }, 2000);
        });
    });
};
