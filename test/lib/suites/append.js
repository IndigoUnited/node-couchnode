'use strict';

var expect     = require('expect.js');
var throwError = require('../throwError');
var bucket     = require('../../../index').wrap(require('../bucket'));
var keys       = require('../fixtures').keys;

// ----------------------------------------------------------------------------

module.exports  = function () {
    it('should append a single key', function (done) {
        var fragment = '123';

        bucket.append('a', fragment, function (err, cas, misses) {
            throwError(err);

            expect(misses.length).to.be(0);
            expect(cas.a).to.be.ok();

            bucket.get('a', function (err, res) {
                throwError(err);

                expect(res.a).to.be(keys.a + fragment);

                return done();
            });
        });
    });

    it('should append multiple keys', function (done) {
        var fragment = '123';

        bucket.append(['a', 'b', 'c'], fragment, function (err, cas, misses) {
            throwError(err);

            expect(misses.length).to.be(0);
            expect(cas.a).to.be.ok();
            expect(cas.b).to.be.ok();
            expect(cas.c).to.be.ok();

            bucket.get(['a', 'b', 'c'], function (err, res) {
                expect(res.a).to.be(keys.a + fragment);
                expect(res.b).to.be(keys.b + fragment);
                expect(res.c).to.be(keys.c + fragment);

                return done();
            });
        });
    });

    it('should put key in misses when appending single non-existing key', function (done) {
        bucket.append('non-existing-key', 'foo', function (err, cas, misses) {
            throwError(err);

            expect(misses.length).to.be(1);
            expect(cas['non-existing-key']).to.not.be.ok();
            expect(misses).to.contain('non-existing-key');

            return done();
        });
    });

    it('should put key in misses when appending multiple non-existing keys', function (done) {
        var fragment = '123';

        bucket.append(['non-existing-key-1', 'non-existing-key-2', 'non-existing-key-3', 'a', 'b', 'c'], fragment, function (err, cas, misses) {
            throwError(err);

            expect(misses.length).to.be(3);
            expect(cas['non-existing-key-1']).to.not.be.ok();
            expect(cas['non-existing-key-2']).to.not.be.ok();
            expect(cas['non-existing-key-3']).to.not.be.ok();
            expect(cas.a).to.be.ok();
            expect(cas.b).to.be.ok();
            expect(cas.c).to.be.ok();
            expect(misses).to.contain('non-existing-key-1');
            expect(misses).to.contain('non-existing-key-2');
            expect(misses).to.contain('non-existing-key-3');

            bucket.get(['a', 'b', 'c'], function (err, res) {
                throwError(err);

                expect(res.a).to.be(keys.a + fragment);
                expect(res.b).to.be(keys.b + fragment);
                expect(res.c).to.be(keys.c + fragment);

                return done();
            });
        });
    });

    it('should support providing CAS tokens indexed by key', function (done) {
        var fragment = '123';

        bucket.get(['a', 'b', 'c', 'f'], function (err, res, cas) {
            throwError(err);

            bucket.append(['a', 'b', 'c'], fragment, { cas: cas }, function (err, cas, misses) {
                throwError(err);

                expect(misses.length).to.be(0);
                expect(res.a).to.be.ok();
                expect(res.b).to.be.ok();
                expect(res.c).to.be.ok();

                // only a few of these keys will actually need the CAS token
                bucket.append(['d', 'e', 'f'], fragment, { cas: cas }, function (err, cas, misses) {
                    throwError(err);

                    expect(misses.length).to.be(0);
                    expect(cas.d).to.be.ok();
                    expect(cas.e).to.be.ok();
                    expect(cas.f).to.be.ok();

                    bucket.get(['a', 'b', 'c', 'd', 'e', 'f'], function (err, res) {
                        throwError(err);

                        expect(res.a).to.be(keys.a + fragment);
                        expect(res.b).to.be(keys.b + fragment);
                        expect(res.c).to.be(keys.c + fragment);
                        expect(res.d).to.be(keys.d + fragment);
                        expect(res.e).to.be(keys.e + fragment);
                        expect(res.f).to.be(keys.f + fragment);

                        return done();
                    });
                });
            });
        });
    });

    it('should support providing CAS tokens in the standard API', function (done) {
        var fragment = '123';

        bucket.get('a', function (err, res, cas) {
            throwError(err);

            bucket.append('a', fragment, { cas: cas.a }, function (err, cas, misses) {
                throwError(err);

                expect(misses.length).to.be(0);
                expect(cas.a).to.be.ok();

                bucket.get('a', function (err, res) {
                    throwError(err);

                    expect(res.a).to.be(keys.a + fragment);

                    return done();
                });
            });
        });
    });

    it('should set .casFailure if it happens', function (done) {
        bucket.get(['a', 'b'], function (err, res, cas) {
            throwError(err);

            bucket.append('a', 'foo', {
                cas: {
                    a: cas.b // provide invalid CAS token
                }
            }, function (err) {
                expect(err.errors.a.code).to.be(bucket.errors.keyAlreadyExists);
                expect(err.errors.a.casFailure).to.be(true);

                return done();
            });
        });
    });
};
