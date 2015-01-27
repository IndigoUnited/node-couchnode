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
    counter0: 0,
    counter1: 1,
    counter2: 2,
    counter3: 3,
    counter4: 4,
    counter5: 5,
    counter6: 6,
    counter7: 7,
    counter8: 8,
    counter9: 9
};

var removeKeys = [
    'non-existing-key',
    'some_key',
    'to-remove-0',
    'to-remove-1',
    'to-remove-2',
    'to-remove-3',
    'to-remove-4',
    'to-remove-5',
    'to-remove-6',
    'to-remove-7',
    'to-remove-8',
    'to-remove-9',
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
