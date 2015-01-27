'use strict';

var expect     = require('expect.js');
var throwError = require('../throwError');
var bucket     = require('../../../index').wrap(require('../bucket'));
var keys       = require('../fixtures').keys;

// ----------------------------------------------------------------------------

module.exports  = function () {
    it('should insert a single key', function (done) {
        var tmp = { somekey: 'foo' };
        bucket.insert(tmp, { expiry: 5 }, function (err) {
            throwError(err);

            bucket.get('somekey', function (err, res) {
                throwError(err);

                expect(res.somekey.value).to.be(tmp.somekey);

                return done();
            });
        });
    });

    it('should insert multiple keys', function (done) {
        var tmp = {
            'to-remove-0': 'foo-0',
            'to-remove-1': 'foo-1',
            'to-remove-2': 'foo-2'
        };

        bucket.insert(tmp, { expiry: 5 }, function (err) {
            throwError(err);

            bucket.get(['to-remove-0', 'to-remove-1', 'to-remove-2'], function (err, res) {
                throwError(err);

                expect(res['to-remove-0'].value).to.be(tmp['to-remove-0']);
                expect(res['to-remove-1'].value).to.be(tmp['to-remove-1']);
                expect(res['to-remove-2'].value).to.be(tmp['to-remove-2']);

                return done();
            });
        });
    });

    it('should only fail the already existing keys, everything else succeeds', function (done) {
        var tmp = {
            a:             'foo-a',
            'to-remove-0': 'foo-0',
            'to-remove-1': 'foo-1',
            'to-remove-2': 'foo-2'
        };

        bucket.insert(tmp, { expiry: 5 }, function (err) {
            expect(err).to.be.ok();
            expect(err.errors.a).to.be.ok();
            expect(err.errors.a.code).to.be(bucket.errors.keyAlreadyExists);

            bucket.get(['a', 'to-remove-0', 'to-remove-1', 'to-remove-2'], function (err, res) {
                throwError(err);

                expect(res.a.value).to.be(keys.a);
                expect(res['to-remove-0'].value).to.be(tmp['to-remove-0']);
                expect(res['to-remove-1'].value).to.be(tmp['to-remove-1']);
                expect(res['to-remove-2'].value).to.be(tmp['to-remove-2']);

                return done();
            });
        });
    });
};
