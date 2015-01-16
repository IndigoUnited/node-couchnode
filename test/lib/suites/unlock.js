'use strict';

var expect     = require('expect.js');
var throwError = require('../throwError');
var bucket     = require('../../../index').wrap(require('../bucket'));
var keys       = require('../fixtures').keys;

// ----------------------------------------------------------------------------

module.exports  = function () {
    it('should unlock a single key', function (done) {
        bucket.getAndLock('a', function (err, res, misses) {
            throwError(err);

            expect(misses.length).to.be(0);
            expect(res.a.value).to.be(keys.a);

            bucket.unlock('a', res.a.cas, function (err, misses) {
                throwError(err);

                expect(misses.length).to.be(0);

                bucket.get('a', function (err, res, misses) {
                    throwError(err);

                    expect(res.a.value).to.be(keys.a);
                    expect(misses.length).to.be(0);

                    done();
                });
            });
        });
    });

    it('should unlock multiple keys', function (done) {
        bucket.getAndLock(['a', 'b', 'c'], function (err, res, misses) {
            throwError(err);

            expect(misses.length).to.be(0);
            expect(res.a.value).to.be(keys.a);
            expect(res.b.value).to.be(keys.b);
            expect(res.c.value).to.be(keys.c);


            bucket.unlock(['a', 'b', 'c'], {
                a: res.a.cas,
                b: res.b.cas,
                c: res.c.cas
            }, function (err, misses) {
                throwError(err);

                expect(misses.length).to.be(0);

                bucket.get(['a', 'b', 'c'], function (err, res, misses) {
                    throwError(err);

                    expect(res.a.value).to.be(keys.a);
                    expect(res.b.value).to.be(keys.b);
                    expect(res.c.value).to.be(keys.c);
                    expect(misses.length).to.be(0);

                    done();
                });
            });
        });
    });

    it('should put key is misses when unlocking a single non-existing key', function (done) {
        bucket.get('a', function (err, res, misses) {
            throwError(err);

            expect(misses.length).to.be(0);
            expect(res.a.value).to.be(keys.a);

            bucket.unlock('non-existing-key', res.a.cas, function (err, misses) { // using just a syntax valid CAS
                throwError(err);

                expect(res['non-existing-key']).to.be(undefined);
                expect(misses).to.contain('non-existing-key');

                return done();
            });
        });
    });

    it('should put keys in misses when unlocking multiple non-existing keys', function (done) {
        bucket.getAndLock(['a', 'b', 'c'], function (err, res, misses) {
            throwError(err);

            expect(misses.length).to.be(0);
            expect(res.a.value).to.be(keys.a);

            bucket.unlock(['non-existing-key-1', 'non-existing-key-2', 'non-existing-key-3', 'a', 'b', 'c'], {
                a: res.a.cas,
                b: res.b.cas,
                c: res.c.cas,
                'non-existing-key-1': res.a.cas, // using just a syntax valid CAS
                'non-existing-key-2': res.a.cas, // using just a syntax valid CAS
                'non-existing-key-3': res.a.cas, // using just a syntax valid CAS
            }, function (err, misses) {
                throwError(err);

                expect(res['non-existing-key-1']).to.be(undefined);
                expect(res['non-existing-key-2']).to.be(undefined);
                expect(res['non-existing-key-3']).to.be(undefined);
                expect(misses).to.contain('non-existing-key-1');
                expect(misses).to.contain('non-existing-key-2');
                expect(misses).to.contain('non-existing-key-3');
                expect(res.a.value).to.be(keys.a);
                expect(res.b.value).to.be(keys.b);
                expect(res.c.value).to.be(keys.c);

                done();
            });
        });

    });
};
