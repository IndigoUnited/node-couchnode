'use strict';

var async  = require('async');
var bucket = require('./bucket');

var keys = {
    a: 'aaa',
    b: 'bbb',
    c: 'ccc',
    d: 'ddd',
    e: 'eee',
    counter: 10
};

module.exports.apply = function (done) {
    async.each(Object.keys(keys), function (key, callback) {
        bucket.upsert(key, keys[key], callback);
    }, done);
};

module.exports.keys = keys;
