'use strict';

var expect     = require('expect.js');
var throwError = require('../throwError');
var bucket     = require('../../../index').wrap(require('../bucket'));
var keys       = require('../fixtures').keys;

// ----------------------------------------------------------------------------

module.exports  = function () {
    it('should counter a single key', function (done) {
        var delta = 1;

        bucket.counter('counter0', delta, function (err, cas, misses) {
            throwError(err);

            expect(misses.length).to.be(0);
            expect(cas.counter0).to.be.ok();

            bucket.get('counter0', function (err, res) {
                throwError(err);

                expect(res.counter0).to.be(keys.counter0 + delta);

                return done();
            });
        });
    });

    it('should counter multiple keys', function (done) {
        var delta = 1;

        bucket.counter(['counter0', 'counter1', 'counter2'], delta, function (err, cas, misses) {
            throwError(err);

            expect(misses.length).to.be(0);
            expect(cas.counter0).to.be.ok();
            expect(cas.counter1).to.be.ok();
            expect(cas.counter2).to.be.ok();

            bucket.get(['counter0', 'counter1', 'counter2'], function (err, res) {
                expect(res.counter0).to.be(keys.counter0 + delta);
                expect(res.counter1).to.be(keys.counter1 + delta);
                expect(res.counter2).to.be(keys.counter2 + delta);

                return done();
            });
        });
    });

    it('should put key in misses when countering single non-existing key', function (done) {
        bucket.counter('non-existing-key', 1, function (err, cas, misses) {
            throwError(err);

            expect(misses.length).to.be(1);
            expect(misses).to.contain('non-existing-key');

            return done();
        });
    });

    it('should put key in misses when countering multiple non-existing keys', function (done) {
        var delta = 1;

        bucket.counter(['non-existing-key-1', 'non-existing-key-2', 'non-existing-key-3', 'counter0', 'counter1', 'counter2'], delta, function (err, cas, misses) {
            throwError(err);

            expect(misses.length).to.be(3);
            expect(cas.counter0).to.be.ok();
            expect(cas.counter1).to.be.ok();
            expect(cas.counter2).to.be.ok();
            expect(misses).to.contain('non-existing-key-1');
            expect(misses).to.contain('non-existing-key-2');
            expect(misses).to.contain('non-existing-key-3');

            bucket.get(['counter0', 'counter1', 'counter2'], function (err, res) {
                throwError(err);

                expect(res.counter0).to.be(keys.counter0 + delta);
                expect(res.counter1).to.be(keys.counter1 + delta);
                expect(res.counter2).to.be(keys.counter2 + delta);

                return done();
            });
        });
    });

    it('should support providing CAS tokens indexed by key', function (done) {
        var delta = 1;

        bucket.get(['counter0', 'counter1', 'counter2', 'counter5'], function (err, res, cas) {
            throwError(err);

            bucket.counter(['counter0', 'counter1', 'counter2'], delta, { cas: cas }, function (err, cas, misses) {
                throwError(err);

                expect(misses.length).to.be(0);
                expect(cas.counter0).to.be.ok();
                expect(cas.counter1).to.be.ok();
                expect(cas.counter2).to.be.ok();

                // only a few of these keys will actually need the CAS token
                bucket.counter(['counter3', 'counter4', 'counter5'], delta, { cas: cas }, function (err, cas, misses) {
                    throwError(err);

                    expect(misses.length).to.be(0);
                    expect(cas.counter3).to.be.ok();
                    expect(cas.counter4).to.be.ok();
                    expect(cas.counter5).to.be.ok();

                    bucket.get(['counter0', 'counter1', 'counter2', 'counter3', 'counter4', 'counter5'], function (err, res) {
                        throwError(err);

                        expect(res.counter0).to.be(keys.counter0 + delta);
                        expect(res.counter1).to.be(keys.counter1 + delta);
                        expect(res.counter2).to.be(keys.counter2 + delta);
                        expect(res.counter3).to.be(keys.counter3 + delta);
                        expect(res.counter4).to.be(keys.counter4 + delta);
                        expect(res.counter5).to.be(keys.counter5 + delta);

                        return done();
                    });
                });
            });
        });
    });

    it('should support providing CAS tokens in the standard API', function (done) {
        var delta = 1;

        bucket.get('counter0', function (err, cas) {
            throwError(err);

            bucket.counter('counter0', delta, { cas: cas.counter0 }, function (err, cas, misses) {
                throwError(err);

                expect(misses.length).to.be(0);
                expect(cas.counter0).to.be.ok();

                bucket.get('counter0', function (err, res) {
                    throwError(err);

                    expect(res.counter0).to.be(keys.counter0 + delta);

                    return done();
                });
            });
        });
    });
};
