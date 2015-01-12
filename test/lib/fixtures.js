'use strict';

var async  = require('async');
var bucket = require('./bucket');

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

module.exports.apply = function (done) {
    async.each(Object.keys(keys), function (key, callback) {
        bucket.upsert(key, keys[key], callback);
    }, done);
};

module.exports.keys = keys;
