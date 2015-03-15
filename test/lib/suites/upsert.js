'use strict';

var expect     = require('expect.js');
var throwError = require('../throwError');
var bucket     = require('../../../index').wrap(require('../bucket'));

// ----------------------------------------------------------------------------

module.exports  = function () {
    it('should upsert a single key', function (done) {
        bucket.upsert({ a: 111 }, function (err, cas) {
            throwError(err);

            expect(cas.a).to.be.ok();

            bucket.get('a', function (err, res) {
                throwError(err);

                expect(res.a).to.be(111);

                return done();
            });
        });
    });

    it('should upsert multiple keys', function (done) {
        bucket.upsert({
            a: 111,
            b: 222,
            c: 333
        }, function (err, cas) {
            throwError(err);

            expect(cas.a).to.be.ok();
            expect(cas.b).to.be.ok();
            expect(cas.c).to.be.ok();

            bucket.get(['a', 'b', 'c'], function (err, res) {
                expect(res.a).to.be(111);
                expect(res.b).to.be(222);
                expect(res.c).to.be(333);

                return done();
            });
        });
    });

    it('should support providing CAS tokens indexed by key', function (done) {
        bucket.getAndLock(['a', 'b', 'c', 'f'], function (err, res, cas) {
            throwError(err);

            bucket.upsert({
                a: 111,
                b: 222,
                c: 333
            }, { cas: cas }, function (err, upsertCas) {
                throwError(err);

                expect(upsertCas.a).to.be.ok();
                expect(upsertCas.b).to.be.ok();
                expect(upsertCas.c).to.be.ok();

                // only a few of these keys will actually need the CAS token
                bucket.upsert({
                    d: 444,
                    e: 555,
                    f: 666
                }, { cas: cas }, function (err, upsertCas) {
                    throwError(err);

                    expect(upsertCas.d).to.be.ok();
                    expect(upsertCas.e).to.be.ok();
                    expect(upsertCas.f).to.be.ok();

                    bucket.get(['a', 'b', 'c', 'd', 'e', 'f'], function (err, res) {
                        throwError(err);

                        expect(res.a).to.be(111);
                        expect(res.b).to.be(222);
                        expect(res.c).to.be(333);
                        expect(res.d).to.be(444);
                        expect(res.e).to.be(555);
                        expect(res.f).to.be(666);

                        return done();
                    });
                });
            });
        });
    });

    it('should support providing CAS tokens in the standard API', function (done) {
        bucket.getAndLock('a', function (err, res, cas) {
            throwError(err);

            bucket.upsert({ a: 111 }, { cas: cas.a }, function (err, cas, misses) {
                throwError(err);

                expect(cas.a).to.be.ok();
                expect(misses.length).to.be(0);

                return done();
            });
        });
    });

    it('should support providing CAS object provided after getting non-existing key', function (done) {
        bucket.get('non-existing-key-1', function (err, res, cas) {
            throwError(err);

            bucket.upsert({ 'non-existing-key-1': 111 }, { cas: cas }, function (err, cas, misses) {
                throwError(err);

                expect(cas['non-existing-key-1']).to.be.ok();
                expect(misses.length).to.be(0);

                return done();
            });
        });
    });
};
