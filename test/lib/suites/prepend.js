'use strict';

var expect     = require('expect.js');
var throwError = require('../throwError');
var bucket     = require('../../../index').wrap(require('../bucket'));
var keys       = require('../fixtures').keys;

// ----------------------------------------------------------------------------

module.exports  = function () {
    it('should prepend a single key', function (done) {
        var fragment = '123';

        bucket.prepend('a', fragment, function (err, res, misses) {
            throwError(err);

            expect(misses.length).to.be(0);
            expect(res.a.cas).to.be.ok();

            bucket.get('a', function (err, res, misses) {
                throwError(err);

                expect(misses.length).to.be(0);
                expect(res.a.value).to.be(fragment + keys.a);

                return done();
            });
        });
    });

    it('should prepend multiple keys', function (done) {
        var fragment = '123';

        bucket.prepend(['a', 'b', 'c'], fragment, function (err, res, misses) {
            throwError(err);

            expect(misses.length).to.be(0);
            expect(res.a.cas).to.be.ok();
            expect(res.b.cas).to.be.ok();
            expect(res.c.cas).to.be.ok();

            bucket.get(['a', 'b', 'c'], function (err, res, misses) {
                expect(misses.length).to.be(0);
                expect(res.a.value).to.be(fragment + keys.a);
                expect(res.b.value).to.be(fragment + keys.b);
                expect(res.c.value).to.be(fragment + keys.c);

                return done();
            });
        });
    });

    it('should put key in misses when prepending single non-existing key', function (done) {
        bucket.prepend('non-existing-key', 'foo', function (err, res, misses) {
            throwError(err);

            expect(misses.length).to.be(1);
            expect(misses).to.contain('non-existing-key');

            return done();
        });
    });

    it('should put key in misses when prepending multiple non-existing keys', function (done) {
        var fragment = '123';

        bucket.prepend(['non-existing-key-1', 'non-existing-key-2', 'non-existing-key-3', 'a', 'b', 'c'], fragment, function (err, res, misses) {
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

                expect(res.a.value).to.be(fragment + keys.a);
                expect(res.b.value).to.be(fragment + keys.b);
                expect(res.c.value).to.be(fragment + keys.c);

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

            bucket.prepend(['a', 'b', 'c'], fragment, { cas: cas }, function (err, res, misses) {
                throwError(err);

                expect(misses.length).to.be(0);
                expect(res.a.cas).to.be.ok();
                expect(res.b.cas).to.be.ok();
                expect(res.c.cas).to.be.ok();

                // only a few of these keys will actually need the CAS token
                bucket.prepend(['d', 'e', 'f'], fragment, { cas: cas }, function (err, res, misses) {
                    throwError(err);

                    expect(misses.length).to.be(0);
                    expect(res.d.cas).to.be.ok();
                    expect(res.e.cas).to.be.ok();
                    expect(res.f.cas).to.be.ok();

                    bucket.get(['a', 'b', 'c', 'd', 'e', 'f'], function (err, res, misses) {
                        throwError(err);

                        expect(misses.length).to.be(0);

                        expect(res.a.value).to.be(fragment + keys.a);
                        expect(res.b.value).to.be(fragment + keys.b);
                        expect(res.c.value).to.be(fragment + keys.c);
                        expect(res.d.value).to.be(fragment + keys.d);
                        expect(res.e.value).to.be(fragment + keys.e);
                        expect(res.f.value).to.be(fragment + keys.f);

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

            bucket.prepend('a', fragment, { cas: res.a.cas }, function (err, res, misses) {
                throwError(err);

                expect(misses.length).to.be(0);
                expect(res.a.cas).to.be.ok();

                bucket.get('a', function (err, res, misses) {
                    throwError(err);

                    expect(misses.length).to.be(0);
                    expect(res.a.value).to.be(fragment + keys.a);

                    return done();
                });
            });
        });
    });
};
