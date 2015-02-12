'use strict';

var expect     = require('expect.js');
var bucket     = require('../../../index').wrap(require('../bucket'));

// ----------------------------------------------------------------------------

module.exports  = function () {
    it('should return the manager', function (done) {
        expect(bucket.manager().flush).to.be.a(Function);
        expect(bucket.manager().getDesignDocument).to.be.a(Function);
        expect(bucket.manager().getDesignDocuments).to.be.a(Function);
        expect(bucket.manager().insertDesignDocument).to.be.a(Function);
        expect(bucket.manager().removeDesignDocument).to.be.a(Function);
        expect(bucket.manager().upsertDesignDocument).to.be.a(Function);

        done();
    });
};
