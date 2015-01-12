'use strict';

var expect     = require('expect.js');
var throwError = require('../throwError');
var bucket     = require('../../../index').wrap(require('../bucket'));
var keys       = require('../fixtures').keys;

// ----------------------------------------------------------------------------

module.exports  = function () {
    it('should prepend a fragment to a key', function (done) {
        var fragment = '123';

        bucket.prepend('a', fragment, function (err) {
            throwError(err);

            bucket.get('a', function (err, res) {
                throwError(err);

                expect(res.a.value).to.be(fragment + keys.a);

                return done();
            });
        });
    });
};
