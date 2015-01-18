'use strict';

var expect     = require('expect.js');
var throwError = require('../throwError');
var bucket     = require('../../../index').wrap(require('../bucket'));
var keys       = require('../fixtures').keys;

// ----------------------------------------------------------------------------

module.exports  = function () {
    it('should counter a single key', function (done) {
        var delta = 1;

        bucket.counter('counter0', delta, function (err, res, misses) {
            throwError(err);

            expect(misses.length).to.be(0);
            expect(res.counter0.cas).to.be.ok();

            bucket.get('counter0', function (err, res, misses) {
                throwError(err);

                expect(misses.length).to.be(0);
                expect(res.counter0.value).to.be(keys.counter0 + delta);

                return done();
            });
        });
    });

    it('should counter multiple keys', function (done) {
        var delta = 1;

        bucket.counter(['counter0', 'counter1', 'counter2'], delta, function (err, res, misses) {
            throwError(err);

            expect(misses.length).to.be(0);
            expect(res.counter0.cas).to.be.ok();
            expect(res.counter1.cas).to.be.ok();
            expect(res.counter2.cas).to.be.ok();

            bucket.get(['counter0', 'counter1', 'counter2'], function (err, res, misses) {
                expect(misses.length).to.be(0);
                expect(res.counter0.value).to.be(keys.counter0 + delta);
                expect(res.counter1.value).to.be(keys.counter1 + delta);
                expect(res.counter2.value).to.be(keys.counter2 + delta);

                return done();
            });
        });
    });

    it('should put key in misses when countering single non-existing key', function (done) {
        bucket.counter('non-existing-key', 1, function (err, res, misses) {
            throwError(err);

            expect(misses.length).to.be(1);
            expect(misses).to.contain('non-existing-key');

            return done();
        });
    });

    it('should put key in misses when countering multiple non-existing keys', function (done) {
        var delta = 1;

        bucket.counter(['non-existing-key-1', 'non-existing-key-2', 'non-existing-key-3', 'counter0', 'counter1', 'counter2'], delta, function (err, res, misses) {
            throwError(err);

            expect(misses.length).to.be(3);
            expect(misses).to.contain('non-existing-key-1');
            expect(misses).to.contain('non-existing-key-2');
            expect(misses).to.contain('non-existing-key-3');

            bucket.get(['counter0', 'counter1', 'counter2'], function (err, res, misses) {
                throwError(err);

                expect(misses.length).to.be(0);
                expect(res.counter0.cas).to.be.ok();
                expect(res.counter1.cas).to.be.ok();
                expect(res.counter2.cas).to.be.ok();

                expect(res.counter0.value).to.be(keys.counter0 + delta);
                expect(res.counter1.value).to.be(keys.counter1 + delta);
                expect(res.counter2.value).to.be(keys.counter2 + delta);

                return done();
            });
        });
    });

    it('should support providing CAS tokens indexed by key', function (done) {
        var delta = 1;

        bucket.get(['counter0', 'counter1', 'counter2', 'counter5'], function (err, res, misses) {
            throwError(err);

            expect(misses.length).to.be(0);

            // set up a key indexed object with CAS tokens
            var cas = {};
            for (var k in res) {
                cas[k] = res[k].cas;
            }

            bucket.counter(['counter0', 'counter1', 'counter2'], delta, { cas: cas }, function (err, res, misses) {
                throwError(err);

                expect(misses.length).to.be(0);
                expect(res.counter0.cas).to.be.ok();
                expect(res.counter1.cas).to.be.ok();
                expect(res.counter2.cas).to.be.ok();

                // only a few of these keys will actually need the CAS token
                bucket.counter(['counter3', 'counter4', 'counter5'], delta, { cas: cas }, function (err, res, misses) {
                    throwError(err);

                    expect(misses.length).to.be(0);
                    expect(res.counter3.cas).to.be.ok();
                    expect(res.counter4.cas).to.be.ok();
                    expect(res.counter5.cas).to.be.ok();

                    bucket.get(['counter0', 'counter1', 'counter2', 'counter3', 'counter4', 'counter5'], function (err, res, misses) {
                        throwError(err);

                        expect(misses.length).to.be(0);

                        expect(res.counter0.value).to.be(keys.counter0 + delta);
                        expect(res.counter1.value).to.be(keys.counter1 + delta);
                        expect(res.counter2.value).to.be(keys.counter2 + delta);
                        expect(res.counter3.value).to.be(keys.counter3 + delta);
                        expect(res.counter4.value).to.be(keys.counter4 + delta);
                        expect(res.counter5.value).to.be(keys.counter5 + delta);

                        return done();
                    });
                });
            });
        });
    });

    it('should support providing CAS tokens in the standard API', function (done) {
        var delta = 1;

        bucket.get('counter0', function (err, res, misses) {
            throwError(err);

            expect(misses.length).to.be(0);

            bucket.counter('counter0', delta, { cas: res.counter0.cas }, function (err, res, misses) {
                throwError(err);

                expect(misses.length).to.be(0);
                expect(res.counter0.cas).to.be.ok();

                bucket.get('counter0', function (err, res, misses) {
                    throwError(err);

                    expect(misses.length).to.be(0);
                    expect(res.counter0.value).to.be(keys.counter0 + delta);

                    return done();
                });
            });
        });
    });
};
