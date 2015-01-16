'use strict';

var isArray  = require('util').isArray;
var cbErrors = require('couchbase').errors;
var async    = require('async');

var Bucket = function (bucket) {
    this._bucket = bucket;
};

// -----------------------------------------------------------------------------

function _handleResult(callback, err, res) {
    return setImmediate(callback.bind(null, null, {
        error:  err,
        result: res
    }));
}

function _handleMultiResults(keys, returnResults, callback, err, results) {
    // err should never be present, as multi errors are in the results, but just in case
    if (err) {
        throw err;
        // return setImmediate(callback.bind(null, err));
    }

    return _mapKeysToResults(keys, results, function __handleMapKeysToResults(err, res, misses) {
        // if should return the results, return it
        if (returnResults) {
            return setImmediate(callback.bind(null, err, res, misses));
        }

        // instead, ignore the results, and just return the misses and error
        return setImmediate(callback.bind(null, err, misses));
    });
}

function _mapKeysToResults(keys, results, callback) {
    var keysArray = _array(keys),
        res       = {},
        total     = keysArray.length,
        i,
        k,
        v,
        misses    = [],
        err       = null;

    for (i = 0; i < total; i++) {
        k = keysArray[i];
        v = results[i];

        if (v.error) {
            // if the error was keyNotFound, key was a miss
            if (v.error.code === cbErrors.keyNotFound || v.error.message === 'key not found') {
                misses.push(k);
            } else {
                // if no error was initialized yet, init it
                if (!err) {
                    err        = new Error('Some keys generated error. Check .errors property of this Error.');
                    err.errors = {};
                }

                // key index the error
                err.errors[k] = v.error; // TODO: test in each operation type these errors, and guarantee that they are showing up.
            }
        } else { // no error, just store the result
            res[k] = v.result;
        }
    }

    // if this was a single key request (not an array), return a single result instead of a key-value object.
    // THIS WAS REMOVED, BECAUSE IT CAUSED PROBLEMS WHEN PROVIDING TUPLES IN UPSERTS, ETC. THERE WAS
    // NO WAY OF UNDERSTANDING IF IT WAS SUPPOSED TO PROVIDE BACK A SINGLE
    // RESULT OR AN ARRAY WITH A SINGLE RESULT. EASIER TO CREATE JUST A SINGLE
    // CONVENTION.
    // if (!isArray(keys)) {
    //     err = !err ? null : err.errors[keys];
    //     res = res[keys];
    // }

    return setImmediate(callback.bind(null, err, res, misses));
}


function _indexProperty(property, keys, options) {
    keys = _array(keys);

    // if only a single key was provided, and property is not "key indexed", index it
    if ((keys.length === 1) && options[property] && !options[property][keys[0]]) {
        var prop = options[property];

        options[property]          = {};
        options[property][keys[0]] = prop;
    }
}

function _array(x) {
    return isArray(x) ? x : [x];
}

// -----------------------------------------------------------------------------

Bucket.prototype.errors = cbErrors; // TODO: document this

Bucket.prototype.append = function (key, fragment, options, callback) {
// console.log('append', arguments);
    return this._bucket.append(key, fragment, options, callback);
};

Bucket.prototype.counter = function (key, delta, options, callback) {
// console.log('counter', arguments);
    return this._bucket.counter(key, delta, options, callback);
};

Bucket.prototype.get = function (keys, callback) {
// console.log('get', arguments);

async.map(_array(keys), function __handleMap(key, done) {
    return this._bucket.get(key, _handleResult.bind(null, done));
}.bind(this), _handleMultiResults.bind(null, keys, true, callback));

    // this._bucket.getMulti(_array(keys), function __handleGetMulti(err, data) {
    //     if (!data && err) {
    //         // if err is not an Error, put it in a new Error message and .originalError property
    //         // TODO: document this
    //         if (!(err instanceof Error)) {
    //             var originalError = err;
    //             err               = new Error('Unexpected error type. Check .originalError for the original error. Here\'s a string representation of the error: ' + err);
    //             err.originalError = originalError;
    //         }
    //
    //         return setImmediate(callback.bind(null, err));
    //     }
    //
    //     var res = {},
    //         k
    //     ;
    //
    //     // keys that were not found
    //     var misses = [];
    //
    //     // final error var. Will be filled, in case of error
    //     var finalError = null;
    //
    //     for (k in data) {
    //         // if there was an error
    //         if (data[k].error) {
    //             // if error was key not found
    //             if (data[k].error.code === cbErrors.keyNotFound || data[k].error.message === 'key not found') { // TODO: remove check for message. That's just for the mock bucket, because it doesn't inject error code
    //                 // // translate to undefined
    //                 // res[k] = undefined;
    //
    //                 // remove key from result set
    //                 misses.push(k);
    //                 delete res[k];
    //             } else {
    //                 // unexpected error
    //
    //                 // if final Error hasn't been initiated, init it
    //                 if (!finalError) {
    //                     finalError = new Error('Some keys generated error. Check .errors property of this Error.'); // TODO: document this
    //                     finalError.errors = {};
    //                 }
    //
    //                 // unexpected error, return same result that was received
    //                 finalError.errors[k] = data[k].error;
    //                 delete data[k].error;
    //             }
    //         } else {
    //             // no error, just return result
    //             res[k] = data[k];
    //         }
    //     }
    //
    //     // if only a single key was requested, return a single result instead of an object of results
    //     // if (!isArray(keys)) {
    //     //     res = res[keys];
    //     // }
    //
    //     return setImmediate(callback.bind(null, finalError, res, misses));
    // });
};

Bucket.prototype.getAndLock = function (keys, options, callback) {
// console.log('getAndLock', arguments);
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    async.map(_array(keys), function __handleMap(key, done) {
        return this._bucket.getAndLock(key, options, _handleResult.bind(null, done));
    }.bind(this), _handleMultiResults.bind(null, keys, true, callback));
};

Bucket.prototype.getAndTouch = function (keys, expiry, options, callback) {
// console.log('getAndTouch', arguments);
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    async.map(_array(keys), function __handleMap(key, done) {
        this._bucket.getAndTouch(key, expiry, options, _handleResult.bind(null, done));
    }.bind(this), _handleMultiResults.bind(null, keys, true, callback));
};

Bucket.prototype.getReplica = function (keys, options, callback) {
// console.log('getReplica', arguments);
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    _indexProperty('index', keys, options);

    async.map(_array(keys), function __handleMap(key, done) {
        this._bucket.getReplica(key, (options.index && options.index[key] ? { index: options.index[key] } : {}), _handleResult.bind(null, done));
    }.bind(this), _handleMultiResults.bind(null, keys, true, callback));
};

Bucket.prototype.insert = function (tuples, options, callback) {
// console.log('insert', arguments);
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    var keys = Object.keys(tuples);

    async.map(keys, function __handleMap(key, done) {
        this._bucket.insert(key, tuples[key], options, _handleResult.bind(null, done));
    }.bind(this), _handleMultiResults.bind(null, keys, true, callback));
};

Bucket.prototype.prepend = function (key, fragment, options, callback) {
// console.log('prepend', arguments);
    return this._bucket.prepend(key, fragment, options, callback);
};

Bucket.prototype.query = function (query, params, callback) {
// console.log('query', arguments);
    return this._bucket.query(query, params, callback);
};

/**
 * Delete documents from server.
 *
 * @param  {array}     keys      An array of keys to delete.
 * @param  {object}    options   Can contain `persist_to`, `replicate_to`, and `cas`, which should be an object with the key and respective CAS token. If only a single key is provided, then the `cas` property can be used as the standard bucket API.
 * @param  {Function}  callback  The callback
 */
Bucket.prototype.remove = function (keys, options, callback) {
// console.log('remove', arguments);
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    _indexProperty('cas', keys, options);

    var opt = {
        persist_to:   options.persist_to ? options.persist_to : 0,
        replicate_to: options.replicate_to ? options.replicate_to : 0
    };

    options.cas = options.cas ? options.cas : {};

    async.map(_array(keys), function __handleMap(key, done) {
        // if there is a cas set for this key, use it.
        if (options.cas[key]) {
            opt.cas = options.cas[key];
        } else {
            delete opt.cas;
        }

        this._bucket.remove(key, opt, _handleResult.bind(null, done));
    }.bind(this), _handleMultiResults.bind(null, keys, true, callback));
};

Bucket.prototype.replace = function (tuples, options, callback) {
// console.log('replace', arguments);
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    var keys = Object.keys(tuples);

    _indexProperty('cas', keys, options);

    var opt = {
        expiry:       options.expiry ? options.expiry : 0,
        persist_to:   options.persist_to ? options.persist_to : 0,
        replicate_to: options.replicate_to ? options.replicate_to : 0
    };

    options.cas = options.cas ? options.cas : {};

    async.map(keys, function __handleMap(key, done) {
        // if there is a cas set for this key, use it.
        if (options.cas[key]) {
            opt.cas = options.cas[key];
        } else {
            delete opt.cas;
        }
// console.log('replace', tuples, keys, key, tuples[key], opt, done);
        this._bucket.replace(key, tuples[key], opt, _handleResult.bind(null, done));
    }.bind(this), _handleMultiResults.bind(null, keys, true, callback));
};

Bucket.prototype.touch = function (keys, expiry, options, callback) {
// console.log('touch', arguments);
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    async.map(_array(keys), function __handleMap(key, done) {
        this._bucket.touch(key, expiry, options, _handleResult.bind(null, done));
    }.bind(this), _handleMultiResults.bind(null, keys, true, callback));
};

Bucket.prototype.unlock = function (keys, cas, callback) {
// console.log('unlock', arguments);

    var tokens = { cas: cas };

    _indexProperty('cas', keys, tokens);

    async.map(_array(keys), function __handleEach(key, done) {

        this._bucket.unlock(key, tokens.cas[key], _handleResult.bind(null, done));
    }.bind(this), _handleMultiResults.bind(null, keys, false, callback));
};

Bucket.prototype.upsert = function (tuples, options, callback) {
// console.log('upsert', arguments);
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    var keys = Object.keys(tuples);

    _indexProperty('cas', keys, options);

    var opt = {
        expiry:       options.expiry ? options.expiry : 0,
        persist_to:   options.persist_to ? options.persist_to : 0,
        replicate_to: options.replicate_to ? options.replicate_to : 0
    };

    options.cas = options.cas ? options.cas : {};

    async.map(keys, function __handleMap(key, done) {
        // if there is a cas set for this key, use it.
        if (options.cas[key]) {
            opt.cas = options.cas[key];
        } else {
            delete opt.cas;
        }

        this._bucket.upsert(key, tuples[key], opt, _handleResult.bind(null, done));
    }.bind(this), _handleMultiResults.bind(null, keys, true, callback));
};

module.exports.wrap = function (bucket) {
    return new Bucket(bucket);
};

module.exports.tuple = function (k, v) {
    var res = {};

    // if it's a set of keys and respective values
    if (isArray(k)) {
        for (var i = k.length - 1; i >= 0; i--) {
            res[k[i]] = v[i];
        }

        return res;
    }

    // just a key and a value
    res[k] = v;

    return res;
};
