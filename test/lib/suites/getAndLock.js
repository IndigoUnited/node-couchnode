'use strict';

var expect     = require('expect.js');
var throwError = require('../throwError');
var bucket     = require('../../../index').wrap(require('../bucket'));
var keys       = require('../fixtures').keys;

// ----------------------------------------------------------------------------

module.exports  = function () {
    it('should get and lock a single key', function (done) {
        bucket.getAndLock('a', function (err, res, cas, misses) {
            throwError(err);

            expect(misses.length).to.be(0);
            expect(res.a).to.be(keys.a);
            expect(cas.a).to.be.ok();

            // try to upsert the key, but don't provide CAS
            bucket.upsert({ a: '111' }, function (err) {
                expect(err.errors.a.code).to.be(bucket.errors.keyAlreadyExists); // TODO: improve finding CAS failures?

                // unlock the key
                bucket.unlock('a', cas.a, done);
            });
        });
    });

    it('should get and lock multiple keys', function (done) {
        bucket.getAndLock(['a', 'b', 'c'], function (err, res, cas, misses) {
            throwError(err);

            expect(misses.length).to.be(0);
            expect(res.a).to.be(keys.a);
            expect(res.b).to.be(keys.b);
            expect(res.c).to.be(keys.c);
            expect(cas.a).to.be.ok();
            expect(cas.b).to.be.ok();
            expect(cas.c).to.be.ok();

            // try to upsert the keys, but don't provide CAS
            bucket.upsert({
                a: '111',
                b: '222',
                c: '333'
            }, function (err) {
                expect(err.errors.a.code).to.be(bucket.errors.keyAlreadyExists);
                expect(err.errors.b.code).to.be(bucket.errors.keyAlreadyExists);
                expect(err.errors.c.code).to.be(bucket.errors.keyAlreadyExists);

                // unlock the keys
                bucket.unlock(['a', 'b', 'c'], cas, done);
            });
        });
    });

    it('should return undefined when getting and locking a single non-existing key', function (done) {
        bucket.getAndLock('non-existing-key', function (err, res, cas, misses) {
            throwError(err);

            expect(res['non-existing-key']).to.be(undefined);
            expect(cas['non-existing-key']).to.be(undefined);
            expect(misses).to.contain('non-existing-key');

            return done();
        });
    });

    it('should return undefined when getting and locking multiple non-existing keys', function (done) {
        bucket.getAndLock(['non-existing-key-1', 'non-existing-key-2', 'non-existing-key-3', 'a', 'b', 'c'], function (err, res, cas, misses) {
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

            // unlock the keys
            bucket.unlock(['a', 'b', 'c'], cas, done);
        });
    });

    it('should set .casFailure if the key is already locked', function (done) {
        bucket.getAndLock('a', function (err, res, cas) {
            throwError(err);

            bucket.getAndLock('a', function (err) {
                expect(err.errors.a.code).to.be(bucket.errors.temporaryError);
                expect(err.errors.a.casFailure).to.be(true);

                bucket.unlock('a', cas, done);
            });
        });
    });

    it('should set .casFailure when trying to write a key that is locked', function (done) {
        bucket.getAndLock('a', function (err, res, cas) {
            throwError(err);

            bucket.upsert({ a: 'b' }, function (err) {
                expect(err.errors.a.casFailure).to.be(true);

                bucket.unlock('a', cas, done);
            });
        });
    });

    it('should be able to get() a key that is locked', function (done) {
        bucket.getAndLock('a', function (err, res, cas) {
            throwError(err);

            bucket.get('a', function (err, res, getCas) {
                throwError(err);

                expect(res.a).to.be.ok();
                expect(getCas.a).to.be.ok();

                bucket.unlock('a', cas, done);
            });
        });
    });
};
