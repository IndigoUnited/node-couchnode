'use strict';

var expect     = require('expect.js');
var throwError = require('../throwError');
var bucket     = require('../../../index').wrap(require('../bucket'));
var keys       = require('../fixtures').keys;

// ----------------------------------------------------------------------------

module.exports  = function () {
    it('should get and lock a single key', function (done) {
        bucket.getAndLock('a', function (err, res) {
            throwError(err);

            expect(res.value).to.be(keys.a);

            // try to upsert the key, but don't provide CAS
            bucket.upsert({ a: '111' }, function (err) {
                expect(err.code).to.be(bucket.errors.keyAlreadyExists);

                // unlock the key
                bucket.unlock('a', res.cas, done);
            });
        });
    });

    it('should get and lock multiple keys', function (done) {
        bucket.getAndLock(['a', 'b', 'c'], function (err, res) {
            throwError(err);

            expect(res.a.value).to.be(keys.a);
            expect(res.b.value).to.be(keys.b);
            expect(res.c.value).to.be(keys.c);

            // try to upsert the keys, but don't provide CAS
            bucket.upsert({
                a: '111',
                b: '222',
                c: '333'
            }, function (err) {
                expect(err.code).to.be(bucket.errors.keyAlreadyExists);

                // unlock the keys
                bucket.unlock(['a', 'b', 'c'], {
                    a: res.a.cas,
                    b: res.b.cas,
                    c: res.c.cas
                }, done);
            });
        });
    });

    it('should return undefined when getting and locking a single non-existing key', function (done) {
        bucket.getAndLock('non-existing-key', function (err, res) {
            throwError(err);

            expect(res).to.be(undefined);

            return done();
        });
    });

    it('should return undefined when getting and locking multiple non-existing keys', function (done) {
        bucket.getAndLock(['non-existing-key-1', 'non-existing-key-2', 'non-existing-key-3', 'a', 'b', 'c'], function (err, res) {
            throwError(err);

            expect(res['non-existing-key-1']).to.be(undefined);
            expect(res['non-existing-key-2']).to.be(undefined);
            expect(res['non-existing-key-3']).to.be(undefined);
            expect(res.a.value).to.be(keys.a);
            expect(res.b.value).to.be(keys.b);
            expect(res.c.value).to.be(keys.c);

            // unlock the keys
            bucket.unlock(['a', 'b', 'c'], {
                a: res.a.cas,
                b: res.b.cas,
                c: res.c.cas
            }, done);
        });
    });
};
