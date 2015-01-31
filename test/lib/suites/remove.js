'use strict';

var expect     = require('expect.js');
var throwError = require('../throwError');
var bucket     = require('../../../index').wrap(require('../bucket'));

// ----------------------------------------------------------------------------

module.exports  = function () {
    it('should remove a single key', function (done) {
        bucket.remove('a', function (err, cas, misses) {
            throwError(err);

            expect(misses.length).to.be(0);
            expect(cas.a).to.be.ok();

            bucket.get('a', function (err, res, cas, misses) {
                throwError(err);

                expect(misses).to.contain('a');

                return done();
            });
        });
    });

    it('should remove multiple keys', function (done) {
        bucket.remove(['a', 'b', 'c'], function (err, cas, misses) {
            throwError(err);

            expect(misses.length).to.be(0);
            expect(cas.a).to.be.ok();
            expect(cas.b).to.be.ok();
            expect(cas.c).to.be.ok();

            bucket.get(['a', 'b', 'c'], function (err, res, cas, misses) {
                throwError(err);

                expect(misses).to.contain('a');
                expect(misses).to.contain('b');
                expect(misses).to.contain('c');

                return done();
            });
        });
    });

    it('should put key in misses when removing single non-existing key', function (done) {
        bucket.remove('non-existing-key', function (err, cas, misses) {
            throwError(err);

            expect(misses.length).to.be(1);
            expect(misses).to.contain('non-existing-key');
            expect(cas['non-existing-key']).to.not.be.ok();

            return done();
        });
    });

    it('should put key in misses when removing multiple non-existing keys', function (done) {
        bucket.remove(['non-existing-key-1', 'non-existing-key-2', 'non-existing-key-3', 'a', 'b', 'c'], function (err, cas, misses) {
            throwError(err);

            expect(misses.length).to.be(3);
            expect(misses).to.contain('non-existing-key-1');
            expect(misses).to.contain('non-existing-key-2');
            expect(misses).to.contain('non-existing-key-3');
            expect(cas.a).to.be.ok();
            expect(cas.b).to.be.ok();
            expect(cas.c).to.be.ok();
            expect(cas['non-existing-key-1']).to.not.be.ok();
            expect(cas['non-existing-key-2']).to.not.be.ok();
            expect(cas['non-existing-key-3']).to.not.be.ok();


            bucket.get('a', function (err, res, cas, misses) {
                expect(misses).to.contain('a');

                return done();
            });
        });
    });

    it('should support providing CAS tokens indexed by key', function (done) {
        bucket.getAndLock(['a', 'b', 'c', 'f'], function (err, res, cas) {
            throwError(err);

            bucket.remove(['a', 'b', 'c'], { cas: cas }, function (err, remCas, misses) {
                throwError(err);

                expect(misses.length).to.be(0);
                expect(cas.a).to.be.ok();
                expect(cas.b).to.be.ok();
                expect(cas.c).to.be.ok();

                // only a few of these keys will actually need the CAS token
                bucket.remove(['d', 'e', 'f'], { cas: cas }, function (err, cas, misses) {
                    throwError(err);

                    expect(misses.length).to.be(0);
                    expect(cas.d).to.be.ok();
                    expect(cas.e).to.be.ok();
                    expect(cas.f).to.be.ok();

                    return done();
                });
            });
        });
    });

    it('should support providing CAS tokens in the standard API', function (done) {
        bucket.getAndLock('a', function (err, res, cas, misses) {
            throwError(err);

            expect(misses.length).to.be(0);

            bucket.remove('a', { cas: cas.a }, function (err, cas, misses) {
                throwError(err);

                expect(misses.length).to.be(0);
                expect(cas.a).to.be.ok();

                return done();
            });
        });
    });
};
