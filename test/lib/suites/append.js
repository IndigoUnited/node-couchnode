'use strict';

var expect     = require('expect.js');
var throwError = require('../throwError');
var bucket     = require('../../../index').wrap(require('../bucket'));
var keys       = require('../fixtures').keys;

// ----------------------------------------------------------------------------

module.exports  = function () {
    it('should append a single key', function (done) {
        var fragment = '123';

        bucket.append('a', fragment, function (err, res, misses) {
            throwError(err);

            expect(misses.length).to.be(0);
            expect(res.a.cas).to.be.ok();

            bucket.get('a', function (err, res, misses) {
                throwError(err);

                expect(misses.length).to.be(0);
                expect(res.a.value).to.be(keys.a + fragment);

                return done();
            });
        });
    });

    it('should append multiple keys', function (done) {
        var fragment = '123';

        bucket.append(['a', 'b', 'c'], fragment, function (err, res, misses) {
            throwError(err);

            expect(misses.length).to.be(0);
            expect(res.a.cas).to.be.ok();
            expect(res.b.cas).to.be.ok();
            expect(res.c.cas).to.be.ok();

            bucket.get(['a', 'b', 'c'], function (err, res, misses) {
                expect(misses.length).to.be(0);
                expect(res.a.value).to.be(keys.a + fragment);
                expect(res.b.value).to.be(keys.b + fragment);
                expect(res.c.value).to.be(keys.c + fragment);

                return done();
            });
        });
    });

    it('should put key in misses when appending single non-existing key', function (done) {
        bucket.append('non-existing-key', 'foo', function (err, res, misses) {
            throwError(err);

            expect(misses.length).to.be(1);
            expect(misses).to.contain('non-existing-key');

            return done();
        });
    });

    it('should put key in misses when appending multiple non-existing keys', function (done) {
        var fragment = '123';

        bucket.append(['non-existing-key-1', 'non-existing-key-2', 'non-existing-key-3', 'a', 'b', 'c'], fragment, function (err, res, misses) {
            throwError(err);

            expect(misses.length).to.be(3);
            expect(misses).to.contain('non-existing-key-1');
            expect(misses).to.contain('non-existing-key-2');
            expect(misses).to.contain('non-existing-key-3');

            bucket.get(['a', 'b', 'c'], function (err, res, misses) {
                throwError(err);

                expect(misses.length).to.be(0);
                expect(res.a.cas).to.be.ok();
                expect(res.b.cas).to.be.ok();
                expect(res.c.cas).to.be.ok();

                expect(res.a.value).to.be(keys.a + fragment);
                expect(res.b.value).to.be(keys.b + fragment);
                expect(res.c.value).to.be(keys.c + fragment);

                return done();
            });
        });
    });

    it('should support providing CAS tokens indexed by key', function (done) {
        var fragment = '123';

        bucket.get(['a', 'b', 'c', 'f'], function (err, res, misses) {
            throwError(err);

            expect(misses.length).to.be(0);

            // set up a key indexed object with CAS tokens
            var cas = {};
            for (var k in res) {
                cas[k] = res[k].cas;
            }

            bucket.append(['a', 'b', 'c'], fragment, { cas: cas }, function (err, res, misses) {
                throwError(err);

                expect(misses.length).to.be(0);
                expect(res.a.cas).to.be.ok();
                expect(res.b.cas).to.be.ok();
                expect(res.c.cas).to.be.ok();

                // only a few of these keys will actually need the CAS token
                bucket.append(['d', 'e', 'f'], fragment, { cas: cas }, function (err, res, misses) {
                    throwError(err);

                    expect(misses.length).to.be(0);
                    expect(res.d.cas).to.be.ok();
                    expect(res.e.cas).to.be.ok();
                    expect(res.f.cas).to.be.ok();

                    bucket.get(['a', 'b', 'c', 'd', 'e', 'f'], function (err, res, misses) {
                        throwError(err);

                        expect(misses.length).to.be(0);

                        expect(res.a.value).to.be(keys.a + fragment);
                        expect(res.b.value).to.be(keys.b + fragment);
                        expect(res.c.value).to.be(keys.c + fragment);
                        expect(res.d.value).to.be(keys.d + fragment);
                        expect(res.e.value).to.be(keys.e + fragment);
                        expect(res.f.value).to.be(keys.f + fragment);

                        return done();
                    });
                });
            });
        });
    });

    it('should support providing CAS tokens in the standard API', function (done) {
        var fragment = '123';

        bucket.get('a', function (err, res, misses) {
            throwError(err);

            expect(misses.length).to.be(0);

            bucket.append('a', fragment, { cas: res.a.cas }, function (err, res, misses) {
                throwError(err);

                expect(misses.length).to.be(0);
                expect(res.a.cas).to.be.ok();

                bucket.get('a', function (err, res, misses) {
                    throwError(err);

                    expect(misses.length).to.be(0);
                    expect(res.a.value).to.be(keys.a + fragment);

                    return done();
                });
            });
        });
    });
};
