'use strict';

var async    = require('async');
var bucket   = require('./bucket');
var cbErrors = require('couchbase').errors;

var keys = {
    a: 'aaa',
    b: 'bbb',
    c: 'ccc',
    d: 'ddd',
    e: 'eee',
    f: 'fff',
    g: 'ggg',
    h: 'hhh',
    i: 'iii',
    j: 'jjj',
    k: 'kkk',
    l: 'lll',
    m: 'mmm',
    n: 'nnn',
    o: 'ooo',
    p: 'ppp',
    q: 'qqq',
    r: 'rrr',
    s: 'sss',
    t: 'ttt',
    u: 'uuu',
    v: 'vvv',
    w: 'www',
    x: 'xxx',
    y: 'yyy',
    z: 'zzz',
    counter: 10
};

var removeKeys = [
    'non-existing-key',
    'some_key',
    'non-existing-key-1',
    'non-existing-key-2',
    'non-existing-key-3'
];

module.exports.apply = function (done) {
    async.parallel([
        async.each.bind(null, removeKeys, function (key, callback) {
            bucket.remove(key, function (err) {
                if (err && err.code !== cbErrors.keyNotFound) {
                    return callback(err);
                }

                return callback();
            });
        }),
        async.each.bind(null, Object.keys(keys), function (key, callback) {
            bucket.upsert(key, keys[key], callback);
        })
    ], done);
};

module.exports.keys = keys;
