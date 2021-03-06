'use strict';

var expect     = require('expect.js');
var throwError = require('../throwError');
var bucket     = require('../../../index').wrap(require('../bucket'));
var keys       = require('../fixtures').keys;

// ----------------------------------------------------------------------------

module.exports  = function () {
    it('should insert a single key', function (done) {
        var tmp = { somekey: 'foo' };
        bucket.insert(tmp, { expiry: 5 }, function (err, cas, existing) {
            throwError(err);

            expect(existing.length).to.be(0);
            expect(cas.somekey).to.be.ok();

            bucket.get('somekey', function (err, res) {
                throwError(err);

                expect(res.somekey).to.be(tmp.somekey);

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

        bucket.insert(tmp, { expiry: 5 }, function (err, cas, existing) {
            throwError(err);

            expect(existing.length).to.be(0);
            expect(cas['to-remove-0']).to.be.ok();
            expect(cas['to-remove-1']).to.be.ok();
            expect(cas['to-remove-2']).to.be.ok();

            bucket.get(['to-remove-0', 'to-remove-1', 'to-remove-2'], function (err, res) {
                throwError(err);

                expect(res['to-remove-0']).to.be(tmp['to-remove-0']);
                expect(res['to-remove-1']).to.be(tmp['to-remove-1']);
                expect(res['to-remove-2']).to.be(tmp['to-remove-2']);

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

        bucket.insert(tmp, { expiry: 5 }, function (err, cas, existing) {
            throwError(err);

            expect(cas['to-remove-0']).to.be.ok();
            expect(cas['to-remove-1']).to.be.ok();
            expect(cas['to-remove-2']).to.be.ok();

            expect(existing).to.contain('a');

            bucket.get(['a', 'to-remove-0', 'to-remove-1', 'to-remove-2'], function (err, res) {
                throwError(err);

                expect(res.a).to.be(keys.a);
                expect(res['to-remove-0']).to.be(tmp['to-remove-0']);
                expect(res['to-remove-1']).to.be(tmp['to-remove-1']);
                expect(res['to-remove-2']).to.be(tmp['to-remove-2']);

                return done();
            });
        });
    });
};
