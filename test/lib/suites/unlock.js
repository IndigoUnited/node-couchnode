'use strict';

var expect     = require('expect.js');
var throwError = require('../throwError');
var bucket     = require('../../../index').wrap(require('../bucket'));
var keys       = require('../fixtures').keys;

// ----------------------------------------------------------------------------

module.exports  = function () {
    it('should unlock a single key', function (done) {
        bucket.getAndLock('a', function (err, res, cas) {
            throwError(err);

            bucket.unlock('a', cas.a, function (err, res, misses) {
                throwError(err);

                expect(misses.length).to.be(0);
                expect(res.a).to.be(true);

                bucket.get('a', function (err, res) {
                    throwError(err);

                    expect(res.a).to.be(keys.a);

                    done();
                });
            });
        });
    });

    it('should unlock multiple keys', function (done) {
        bucket.getAndLock(['a', 'b', 'c'], function (err, res, cas) {
            throwError(err);

            bucket.unlock(['a', 'b', 'c'], cas, function (err, res, misses) {
                throwError(err);

                expect(misses.length).to.be(0);
                expect(res.a).to.be(true);
                expect(res.b).to.be(true);
                expect(res.c).to.be(true);

                bucket.get(['a', 'b', 'c'], function (err, res) {
                    throwError(err);

                    expect(res.a).to.be(keys.a);
                    expect(res.b).to.be(keys.b);
                    expect(res.c).to.be(keys.c);

                    done();
                });
            });
        });
    });

    it('should put key is misses when unlocking a single non-existing key', function (done) {
        // fetch some key just to get a syntax valid CAS token to use below
        bucket.get('a', function (err, res, cas) {
            throwError(err);

            bucket.unlock('non-existing-key', cas.a, function (err, res, misses) { // using just a syntax valid CAS
                throwError(err);

                expect(res['non-existing-key']).to.be(undefined);
                expect(misses).to.contain('non-existing-key');

                return done();
            });
        });
    });

    it('should put keys in misses when unlocking multiple non-existing keys', function (done) {
        bucket.getAndLock(['a', 'b', 'c'], function (err, res, cas) {
            throwError(err);

            bucket.unlock(['non-existing-key-1', 'non-existing-key-2', 'non-existing-key-3', 'a', 'b', 'c'], {
                a: cas.a,
                b: cas.b,
                c: cas.c,
                'non-existing-key-1': cas.a, // using just a syntax valid CAS
                'non-existing-key-2': cas.a, // using just a syntax valid CAS
                'non-existing-key-3': cas.a, // using just a syntax valid CAS
            }, function (err, res, misses) {
                throwError(err);

                expect(res.a).to.be(true);
                expect(res.b).to.be(true);
                expect(res.c).to.be(true);
                expect(res['non-existing-key-1']).to.be(undefined);
                expect(res['non-existing-key-2']).to.be(undefined);
                expect(res['non-existing-key-3']).to.be(undefined);
                expect(misses).to.contain('non-existing-key-1');
                expect(misses).to.contain('non-existing-key-2');
                expect(misses).to.contain('non-existing-key-3');

                done();
            });
        });
    });

    it('should set .casFailure if it happens', function (done) {
        bucket.getAndLock(['z', 'b'], function (err, res, cas) {
            throwError(err);

            bucket.unlock(['z', 'b'], {
                z: cas.b, // provide invalid CAS token
                b: cas.b
            }, function (err) {
                expect(err.errors.b).to.be(undefined);
                expect(err.errors.z.code).to.be(bucket.errors.temporaryError);
                expect(err.errors.z.casFailure).to.be(true);

                bucket.unlock('z', cas, done);
            });
        });
    });
};
