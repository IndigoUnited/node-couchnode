'use strict';

var async    = require('async');
var bucket   = require('../bucket');
var cbErrors = require('couchbase').errors;
var fs       = require('fs');
var path     = require('path');

function beerSample() {
    var sample   = {},
        location = path.join(__dirname, './beer-sample/docs/');

    fs.readdirSync(location).forEach(function (file) {
        if (path.extname(file) !== '.json') {
            return;
        }

        sample[path.basename(file, '.json')] = require(location + file);
    });

    return sample;
}

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

// mix in beers into the keys
var beers = beerSample();
for (var k in beers) {
    keys[k] = beers[k];
}

var keysToBeRemoved = [
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

// add all keys to be removed
for (var k in keys) {
    keysToBeRemoved.push(k);
}

var designDocumentsToBeRemoved = [
    'couchnodeDesignDoc0',
    'couchnodeDesignDoc1',
    'couchnodeDesignDoc2',
    'couchnodeDesignDoc3',
    'couchnodeDesignDoc4',
    'couchnodeDesignDoc5',
    'couchnodeDesignDoc6',
    'couchnodeDesignDoc7',
    'couchnodeDesignDoc8',
    'couchnodeDesignDoc9',
];

function removeKeys(done) {
    async.each(keysToBeRemoved, function (key, callback) {
        bucket.remove(key, function (err) {
            if (err && err.code !== cbErrors.keyNotFound) {
                return callback(err);
            }

            return callback();
        });
    }, done);
}

function removeDesignDocuments(done) {
    var manager = bucket.manager();

    async.each(designDocumentsToBeRemoved, function (name, callback) {
        manager.removeDesignDocument(name, function (err) {
            return callback(err && (err.message !== 'missing' && err.message !== 'deleted') ? err : null);
        });
    }, done);
}

function upsertKeys(done) {
    async.each(Object.keys(keys), function (key, callback) {
        bucket.upsert(key, keys[key], callback);
    }, done);
}

module.exports.apply = function (done) {
    var cleanUpFn = async.parallel.bind(null, [
        removeKeys,
        removeDesignDocuments
    ]);

    async.series([
        cleanUpFn,
        upsertKeys
    ], done);
};

module.exports.cleanUp = function (done) {
    async.parallel([
        removeDesignDocuments,
        removeKeys
    ], done);
};

module.exports.keys                       = keys;
module.exports.keysToBeRemoved            = keysToBeRemoved;
module.exports.designDocumentsToBeRemoved = designDocumentsToBeRemoved;
