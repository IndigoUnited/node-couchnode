'use strict';

var expect     = require('expect.js');
var bucket     = require('../../../index').wrap(require('../bucket'));

// ----------------------------------------------------------------------------

module.exports  = function () {
    it('return same instance if wrapping an instance of Bucket', function (done) {
        expect(require('../../../index').wrap(bucket)).to.be(bucket);

        return done();
    });
};
