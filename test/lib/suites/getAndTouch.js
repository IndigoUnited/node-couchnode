'use strict';

var expect     = require('expect.js');
var throwError = require('../throwError');
var bucket     = require('../../../index').wrap(require('../bucket'));
var keys       = require('../fixtures').keys;

// ----------------------------------------------------------------------------

module.exports  = function () {
    it('should get and touch a single key', function (done) {
        this.timeout(3000);

        bucket.getAndTouch('a', 1, function (err, res, cas, misses) {
            throwError(err);

            expect(misses.length).to.be(0);
            expect(res.a).to.be(keys.a);
            expect(cas.a).to.be.ok();

            setTimeout(function () {
                bucket.get('a', function (err, res, cas, misses) {
                    expect(misses).to.contain('a');

                    return done();
                });
            }, 2000);
        });
    });

    it('should get and touch multiple keys', function (done) {
        this.timeout(3000);

        bucket.getAndTouch(['a', 'b', 'c'], 1, function (err, res, cas, misses) {
            throwError(err);

            expect(misses.length).to.be(0);
            expect(res.a).to.be(keys.a);
            expect(res.b).to.be(keys.b);
            expect(res.c).to.be(keys.c);
            expect(cas.a).to.be.ok();
            expect(cas.b).to.be.ok();
            expect(cas.c).to.be.ok();

            setTimeout(function () {
                bucket.get(['a', 'b', 'c'], function (err, res, cas, misses) {
                    expect(misses).to.contain('a');
                    expect(misses).to.contain('b');
                    expect(misses).to.contain('c');

                    return done();
                });
            }, 2000);
        });
    });

    it('should return undefined when getting and touching a single non-existing key', function (done) {
        bucket.getAndTouch('non-existing-key', 1, function (err, res, cas, misses) {
            throwError(err);

            expect(misses).to.contain('non-existing-key');
            expect(res['non-existing-key']).to.be(undefined);
            expect(cas['non-existing-key']).to.be(undefined);

            return done();
        });
    });

    it('should return undefined when getting and touching multiple non-existing keys', function (done) {
        this.timeout(3000);

        bucket.getAndTouch(['non-existing-key-1', 'non-existing-key-2', 'non-existing-key-3', 'a', 'b', 'c'], 1, function (err, res, cas, misses) {
            throwError(err);

            expect(res['non-existing-key-1']).to.be(undefined);
            expect(res['non-existing-key-2']).to.be(undefined);
            expect(res['non-existing-key-3']).to.be(undefined);
            expect(cas['non-existing-key-1']).to.be(undefined);
            expect(cas['non-existing-key-2']).to.be(undefined);
            expect(cas['non-existing-key-3']).to.be(undefined);
            expect(misses).to.contain('non-existing-key-1');
            expect(misses).to.contain('non-existing-key-2');
            expect(misses).to.contain('non-existing-key-3');
            expect(res.a).to.be(keys.a);
            expect(res.b).to.be(keys.b);
            expect(res.c).to.be(keys.c);
            expect(cas.a).to.be.ok();
            expect(cas.b).to.be.ok();
            expect(cas.c).to.be.ok();

            setTimeout(function () {
                bucket.get(['a', 'b', 'c'], function (err, res, cas, misses) {
                    expect(misses).to.contain('a');
                    expect(misses).to.contain('b');
                    expect(misses).to.contain('c');

                    return done();
                });
            }, 2000);
        });
    });
};
