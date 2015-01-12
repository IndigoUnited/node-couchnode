'use strict';

var expect     = require('expect.js');
var throwError = require('../throwError');
var bucket     = require('../../../index').wrap(require('../bucket'));
var keys       = require('../fixtures').keys;

// ----------------------------------------------------------------------------

module.exports  = function () {
    it('should append a fragment to a key', function (done) {
        var fragment = '123';

        bucket.append('a', fragment, function (err) {
            throwError(err);

            bucket.get('a', function (err, res) {
                throwError(err);

                expect(res.a.value).to.be(keys.a + fragment);

                return done();
            });
        });
    });
};
