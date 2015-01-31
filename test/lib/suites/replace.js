'use strict';

var expect     = require('expect.js');
var throwError = require('../throwError');
var bucket     = require('../../../index').wrap(require('../bucket'));

// ----------------------------------------------------------------------------

module.exports  = function () {
    it('should replace a single key', function (done) {
        bucket.replace({ a: 111 }, function (err, cas, misses) {
            throwError(err);

            expect(misses.length).to.be(0);
            expect(cas.a).to.be.ok();

            bucket.get('a', function (err, res, getCas) {
                throwError(err);

                expect(misses.length).to.be(0);
                expect(res.a).to.be(111);
                expect(JSON.stringify(cas.a)).to.be(JSON.stringify(getCas.a));

                return done();
            });
        });
    });

    it('should replace multiple keys', function (done) {
        bucket.replace({
            a: 111,
            b: 222,
            c: 333
        }, function (err, cas, misses) {
            throwError(err);

            expect(misses.length).to.be(0);
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

    it('should put key in misses when replacing single non-existing key', function (done) {
        bucket.replace({ 'non-existing-key': 'foo' }, function (err, cas, misses) {
            throwError(err);

            expect(misses.length).to.be(1);
            expect(cas['non-existing-key']).to.not.be.ok();
            expect(misses).to.contain('non-existing-key');

            return done();
        });
    });

    it('should put key in misses when replacing multiple non-existing keys', function (done) {
        bucket.replace({
            'non-existing-key-1': 'foo',
            'non-existing-key-2': 'foo',
            'non-existing-key-3': 'foo',
            a: 111,
            b: 222,
            c: 333
        }, function (err, cas, misses) {
            throwError(err);

            expect(misses.length).to.be(3);
            expect(cas['non-existing-key-1']).to.not.be.ok();
            expect(cas['non-existing-key-2']).to.not.be.ok();
            expect(cas['non-existing-key-3']).to.not.be.ok();
            expect(misses).to.contain('non-existing-key-1');
            expect(misses).to.contain('non-existing-key-2');
            expect(misses).to.contain('non-existing-key-3');

            bucket.get(['a', 'b', 'c'], function (err, res) {
                throwError(err);

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

            bucket.replace({
                a: 111,
                b: 222,
                c: 333
            }, { cas: cas }, function (err, replaceCas, misses) {
                throwError(err);

                expect(misses.length).to.be(0);
                expect(replaceCas.a).to.be.ok();
                expect(replaceCas.b).to.be.ok();
                expect(replaceCas.c).to.be.ok();

                // only a few of these keys will actually need the CAS token
                bucket.replace({
                    d: 444,
                    e: 555,
                    f: 666
                }, { cas: cas }, function (err, replaceCas, misses) {
                    throwError(err);

                    expect(misses.length).to.be(0);
                    expect(replaceCas.d).to.be.ok();
                    expect(replaceCas.e).to.be.ok();
                    expect(replaceCas.f).to.be.ok();

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

            bucket.replace({ a: 111 }, { cas: cas.a }, function (err, cas, misses) {
                throwError(err);

                expect(misses.length).to.be(0);
                expect(cas.a).to.be.ok();

                return done();
            });
        });
    });
};
