'use strict';

var expect     = require('expect.js');
var throwError = require('../throwError');
var bucket     = require('../../../index').wrap(require('../bucket'));
var keys       = require('../fixtures').keys;

// ----------------------------------------------------------------------------

module.exports  = function () {
//     it.skip('should upsert 1M keys', function (done) {
//         this.timeout(0);
//         var tuples = {};
//         var keys   = [];
// // console.log(bucket.bucket.operationTimeout);
//         for (var i = 0; i < 1000000; i++) {
//             keys.push('mykey_' + i);

//             tuples['mykey_' + i] = '01234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789';
//         }


//         console.time('upsert');

//         bucket.upsert(tuples, function (err, cas) {
//             if (err) {
//                 console.error(err.errors[Object.keys(err.errors)[0]]);
//             }
//             throwError(err);

//             console.timeEnd('upsert');



//             console.time('get');

//             bucket.get(keys, function (err, cas) {
//                 if (err) {
//                     console.error(err.errors[Object.keys(err.errors)[0]]);
//                 }
//                 throwError(err);

//                 console.timeEnd('get');

//                 return done();
//             });
//         });
//     });

    it('should get a single key', function (done) {
        bucket.get('a', function (err, res, cas, misses) {
            throwError(err);

            expect(misses.length).to.be(0);
            expect(res.a).to.be(keys.a);
            expect(cas.a).to.be.ok();

            return done();
        });
    });

    it('should get multiple keys', function (done) {
        bucket.get(['a', 'b', 'c'], function (err, res, cas, misses) {
            throwError(err);

            expect(misses.length).to.be(0);
            expect(cas.a).to.be.ok();
            expect(cas.b).to.be.ok();
            expect(cas.c).to.be.ok();
            expect(res.a).to.be(keys.a);
            expect(res.b).to.be(keys.b);
            expect(res.c).to.be(keys.c);

            return done();
        });
    });

    it('should return undefined when getting a single non-existing key', function (done) {
        bucket.get('non-existing-key', function (err, res, cas, misses) {
            throwError(err);

            expect(res['non-existing-key']).to.be(undefined);
            expect(cas['non-existing-key']).to.be(undefined);
            expect(misses.length).to.be(1);
            expect(misses).to.contain('non-existing-key');

            return done();
        });
    });

    it('should return undefined when getting multiple non-existing keys', function (done) {
        bucket.get(['non-existing-key-1', 'non-existing-key-2', 'non-existing-key-3', 'a', 'b', 'c'], function (err, res, cas, misses) {
            throwError(err);

            expect(res['non-existing-key-1']).to.be(undefined);
            expect(res['non-existing-key-2']).to.be(undefined);
            expect(res['non-existing-key-3']).to.be(undefined);
            expect(cas['non-existing-key-1']).to.be(undefined);
            expect(cas['non-existing-key-2']).to.be(undefined);
            expect(cas['non-existing-key-3']).to.be(undefined);
            expect(misses).to.contain('non-existing-key-1');
            expect(misses).to.contain('non-existing-key-2');
            expect(misses).to.contain('non-existing-key-3');
            expect(misses.length).to.be(3);
            expect(res.a).to.be(keys.a);
            expect(res.b).to.be(keys.b);
            expect(res.c).to.be(keys.c);

            return done();
        });
    });
};
