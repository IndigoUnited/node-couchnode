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
        this.timeout(10000);

        var manager = bucket.manager();

        var designDoc = fixtures.designDocumentsToBeRemoved[0];

        manager.upsertDesignDocument(designDoc, {
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
                    },
                    reduce: '_count'
                },
                by_location: {
                    map: function (doc, meta) {
                        if (doc.country && doc.state && doc.city) {
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

            // wait for the view to stabilize
            setTimeout(function () {
                var query = bucket
                    .viewQuery(designDoc, 'brewery_beers')
                    .range(['a'],['m'], true)
                    .reduce(false)
                    .stale(bucket.viewQuery.Update.BEFORE)
                ;

                bucket.query(query, function (err, results, meta) {
                    throwError(err);

                    expect(results.length).to.be(10);
                    expect(meta.total_rows).to.be(132);

                    done();
                });
            }, 5000);
        });
    });
};
