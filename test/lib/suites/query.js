/* global emit */

'use strict';

var expect     = require('expect.js');
var throwError = require('../throwError');
var bucket     = require('../../../index').wrap(require('../bucket'));
var fixtures   = require('../fixtures');
var keys       = require('../fixtures').keys;

// ----------------------------------------------------------------------------

module.exports  = function () {
    it('should be able to perform a ViewQuery', function (done) {
        var manager = bucket.manager();

        var designDoc = fixtures.designDocumentsToBeRemoved[0];

        manager.upsertDesignDocument(designDoc, {
            _id: '_design/beer',
            language: 'javascript',
            views: {
                brewery_beers: {
                    map: function (doc, meta) {
                        switch (doc.type) {
                        case 'brewery':
                            emit([meta.id]);

                            break;
                        case 'beer':
                            if (doc.brewery_id) {
                                emit([doc.brewery_id, meta.id]);
                            }

                            break;
                        }
                    }
                },
                by_location: {
                    map: function (doc, meta) {
                        if (doc.country, doc.state, doc.city) {
                            emit([doc.country, doc.state, doc.city], 1);
                        } else if (doc.country, doc.state) {
                            emit([doc.country, doc.state], 1);
                        } else if (doc.country) {
                            emit([doc.country], 1);
                        }
                    },
                    reduce: '_count'
                }
            }
        }, function (err) {
            throwError(err);

            done();
        });
    });
};
