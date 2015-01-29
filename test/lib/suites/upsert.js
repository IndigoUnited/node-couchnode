'use strict';

var expect     = require('expect.js');
var throwError = require('../throwError');
var bucket     = require('../../../index').wrap(require('../bucket'));

// ----------------------------------------------------------------------------

module.exports  = function () {
    it('should upsert a single key', function (done) {
        bucket.upsert({ a: 111 }, function (err, res) {
            throwError(err);

            bucket.get('a', function (err, res, misses) {
                throwError(err);

                expect(misses.length).to.be(0);
                expect(res.a.value).to.be(111);

                return done();
            });
        });
    });

    it('should upsert multiple keys', function (done) {
        bucket.upsert({
            a: 111,
            b: 222,
            c: 333
        }, function (err, res) {
            throwError(err);

            bucket.get(['a', 'b', 'c'], function (err, res, misses) {
                expect(misses.length).to.be(0);
                expect(res.a.value).to.be(111);
                expect(res.b.value).to.be(222);
                expect(res.c.value).to.be(333);

                return done();
            });
        });
    });

    it('should support providing CAS tokens indexed by key', function (done) {
        bucket.getAndLock(['a', 'b', 'c', 'f'], function (err, res, misses) {
            throwError(err);

            expect(misses.length).to.be(0);

            // set up a key indexed object with CAS tokens
            var cas = {};
            for (var k in res) {
                cas[k] = res[k].cas;
            }

            bucket.upsert({
                a: 111,
                b: 222,
                c: 333
            }, { cas: cas }, function (err, res) {
                throwError(err);

                // only a few of these keys will actually need the CAS token
                bucket.upsert({
                    d: 444,
                    e: 555,
                    f: 666
                }, { cas: cas }, function (err, res) {
                    throwError(err);

                    bucket.get(['a', 'b', 'c', 'd', 'e', 'f'], function (err, res, misses) {
                        throwError(err);

                        expect(misses.length).to.be(0);

                        expect(res.a.value).to.be(111);
                        expect(res.b.value).to.be(222);
                        expect(res.c.value).to.be(333);
                        expect(res.d.value).to.be(444);
                        expect(res.e.value).to.be(555);
                        expect(res.f.value).to.be(666);

                        return done();
                    });
                });
            });
        });
    });

    it('should support providing CAS tokens in the standard API', function (done) {
        bucket.getAndLock('a', function (err, res, misses) {
            throwError(err);

            expect(misses.length).to.be(0);

            bucket.upsert({ a: 111 }, { cas: res.a.cas }, function (err, res) {
                throwError(err);

                expect(res.a.cas).to.be.ok();

                return done();
            });
        });
    });
};
