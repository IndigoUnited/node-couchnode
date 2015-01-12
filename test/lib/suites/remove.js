'use strict';

var expect     = require('expect.js');
var throwError = require('../throwError');
var bucket     = require('../../../index').wrap(require('../bucket'));

// ----------------------------------------------------------------------------

module.exports  = function () {
    it('should remove a single key', function (done) {
        bucket.remove('a', function (err, misses) {
            throwError(err);

            expect(misses.length).to.be(0);

            bucket.get('a', function (err, res, misses) {
                throwError(err);

                expect(misses.length).to.be(1);
                expect(misses).to.contain('a');

                return done();
            });
        });
    });

    it('should remove multiple keys', function (done) {
        bucket.remove(['a', 'b', 'c'], function (err, misses) {
            throwError(err);

            expect(misses.length).to.be(0);

            bucket.get(['a', 'b', 'c'], function (err, res, misses) {
                throwError(err);

                expect(misses.length).to.be(3);
                expect(misses).to.contain('a');
                expect(misses).to.contain('b');
                expect(misses).to.contain('c');

                return done();
            });
        });
    });

    it('should put key in misses when removing single non-existing key', function (done) {
        bucket.remove('non-existing-key', function (err, misses) {
            throwError(err);

            expect(misses.length).to.be(1);
            expect(misses).to.contain('non-existing-key');

            return done();
        });
    });

    it('should put key in misses when removing multiple non-existing keys', function (done) {
        bucket.remove(['non-existing-key-1', 'non-existing-key-2', 'non-existing-key-3', 'a', 'b', 'c'], function (err, misses) {
            throwError(err);

            expect(misses.length).to.be(3);
            expect(misses).to.contain('non-existing-key-1');
            expect(misses).to.contain('non-existing-key-2');
            expect(misses).to.contain('non-existing-key-3');

            bucket.get('a', function (err, res, misses) {
                expect(misses.length).to.be(1);
                expect(misses).to.contain('a');

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

            bucket.remove(['a', 'b', 'c'], { cas: cas }, function (err, misses) {
                throwError(err);

                expect(misses.length).to.be(0);

                // only a few of these keys will actually need the CAS token
                bucket.remove(['d', 'e', 'f'], { cas: cas }, function (err, misses) {
                    throwError(err);

                    expect(misses.length).to.be(0);

                    return done();
                });
            });
        });
    });

    it('should support providing CAS tokens in the standard API', function (done) {
        bucket.getAndLock('a', function (err, res, misses) {
            throwError(err);

            expect(misses.length).to.be(0);

            bucket.remove('a', { cas: res.a.cas }, function (err, misses) {
                throwError(err);

                expect(misses.length).to.be(0);

                return done();
            });
        });
    });
};
