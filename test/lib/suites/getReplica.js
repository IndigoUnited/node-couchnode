'use strict';

var expect     = require('expect.js');
var throwError = require('../throwError');
var bucket     = require('../../../index').wrap(require('../bucket'));
var keys       = require('../fixtures').keys;

// ----------------------------------------------------------------------------

module.exports  = function () {
    it('should get a single key replica', function (done) {
        bucket.getReplica('a', function (err, res) {
            throwError(err);

            expect(res.value).to.be(keys.a);

            return done();
        });
    });

    it('should get multiple keys replicas', function (done) {
        bucket.getReplica(['a', 'b', 'c'], function (err, res) {
            throwError(err);

            expect(res.a.value).to.be(keys.a);
            expect(res.b.value).to.be(keys.b);
            expect(res.c.value).to.be(keys.c);

            return done();
        });
    });

    it('should return undefined when getting a single non-existing key', function (done) {
        bucket.getReplica('non-existing-key', function (err, res, misses) {
            throwError(err);

            expect(res).to.be(undefined);
            expect(misses).to.contain('non-existing-key');

            return done();
        });
    });

    it('should return undefined when getting multiple non-existing keys', function (done) {
        bucket.getReplica(['non-existing-key-1', 'non-existing-key-2', 'non-existing-key-3', 'a', 'b', 'c'], function (err, res, misses) {
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

            return done();
        });
    });
};
