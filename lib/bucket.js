'use strict';

var isArray  = require('util').isArray;
var cbErrors = require('couchbase').errors;
var async    = require('async');

var Bucket = function (bucket) {
    this._bucket = bucket;
};

// -----------------------------------------------------------------------------

function _mapKeysToResults(keys, results, callback) {
    var keysArray = _array(keys),
        res       = {},
        total     = keysArray.length,
        i;
// console.log(keys, results);
    for (i = 0; i < total; i++) {
        res[keysArray[i]] = results[i];
    }

    if (!isArray(keys)) {
        res = res[keys];
    }

    return setImmediate(callback.bind(null, null, res));
}

function _handleResults(keys, callback, err, results) {
    if (err) {
        return callback(err);
    }
// console.log(arguments);
    return _mapKeysToResults(keys, results, callback);
}

function _indexCas(keys, options) {
    // if only a single key was provided, and CAS is not "key indexed", index it
    if ((!isArray(keys) || keys.length === 1) && options.cas && !options.cas[keys[0]]) {
        var cas = options.cas;

        options.cas          = {};
        options.cas[keys[0]] = cas;
    }
}

function _array(x) {
    return isArray(x) ? x : [x];
}

// -----------------------------------------------------------------------------

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
    this._bucket.getMulti(_array(keys), function __handleGetMulti(err, data) {
        if (!data && err) {
            return setImmediate(callback.bind(null, err));
        }

        var res = {},
            k
        ;

        for (k in data) {
            // if there was an error
            if (data[k].error) {
                // if error was key not found
                if (data[k].error.code === cbErrors.keyNotFound || data[k].error.message === 'key not found') { // TODO: remove check for message. That's just for the mock bucket, because it doesn't inject error code
                    // translate to undefined
                    res[k] = undefined;
                } else {
                    // unexpected error, return same result that was received
                    return setImmediate(callback.bind(null, err, data));
                }
            } else {
                // no error, just return result
                res[k] = data[k];
            }
        }

        // if only a single key was requested, return a single result instead of an object of results
        if (!isArray(keys)) {
            res = res[keys];
        }

        return setImmediate(callback.bind(null, null, res));
    });
};

Bucket.prototype.getAndLock = function (keys, options, callback) {
// console.log('getAndLock', arguments);
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    async.map(_array(keys), function __handleMap(key, done) {
        return this._bucket.getAndLock(key, options, done);
    }.bind(this), _handleResults.bind(null, keys, callback));
};

Bucket.prototype.getAndTouch = function (keys, expiry, options, callback) {
// console.log('getAndTouch', arguments);
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    async.map(_array(keys), function __handleMap(key, done) {
        this._bucket.getAndTouch(key, expiry, options, done);
    }.bind(this), _handleResults.bind(null, keys, callback));
};

Bucket.prototype.getReplica = function (keys, options, callback) {
// console.log('getReplica', arguments);
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    async.map(_array(keys), function __handleMap(key, done) {
        this._bucket.getReplica(key, (options.index && options.index[key] ? { index: options.index[key] } : {}), done);
    }.bind(this), _handleResults.bind(null, keys, callback));
};

Bucket.prototype.insert = function (tuples, options, callback) {
// console.log('insert', arguments);
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    async.each(Object.keys(tuples), function __handleEach(key, done) {
        this._bucket.insert(key, tuples[key], options, done);
    }.bind(this), callback);
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

    _indexCas(keys, options);

    var opt = {
        persist_to:   options.persist_to ? options.persist_to : 0,
        replicate_to: options.replicate_to ? options.replicate_to : 0
    };

    options.cas = options.cas ? options.cas : {};

    async.map(_array(keys), function __handleMap(key, cb) {
        // if there is a cas set for this key, use it.
        if (options.cas[key]) {
            opt.cas = options.cas[key];
        } else {
            delete opt.cas;
        }

        this._bucket.remove(key, opt, function __handleRemoveKey(err) {
// console.log('__handleRemoveKey', err ? err.code : undefined);
            // ignore keyNotFound errors, remove should be idempotent
            if (err && err.code !== cbErrors.keyNotFound) {
                return setImmediate(cb.bind(null, err));
            }

            // second param is true if remove happened, false otherwise
            return setImmediate(cb.bind(null, null, !err));
        });
    }.bind(this), _handleResults.bind(null, keys, callback));
};

Bucket.prototype.replace = function (tuples, options, callback) {
// console.log('replace', arguments);
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    var keys = Object.keys(tuples);

    _indexCas(keys, options);

    var opt = {
        expiry:       options.expiry ? options.expiry : 0,
        persist_to:   options.persist_to ? options.persist_to : 0,
        replicate_to: options.replicate_to ? options.replicate_to : 0
    };

    options.cas = options.cas ? options.cas : {};

// CONTINUE: note that when doing "single operations" instead of "multi", should probably treat the .cas option as the standard API. This is causing errors
    async.each(keys, function __handleEach(key, done) {
        // if there is a cas set for this key, use it.
        if (options.cas[key]) {
            opt.cas = options.cas[key];
        } else {
            delete opt.cas;
        }
// console.log('replace', tuples, keys, key, tuples[key], opt, done);
        this._bucket.replace(key, tuples[key], opt, done);
    }.bind(this), callback);
};

Bucket.prototype.touch = function (keys, expiry, options, callback) {
// console.log('touch', arguments);
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    async.each(_array(keys), function __handleEach(key, done) {
        this._bucket.touch(key, expiry, options, done);
    }.bind(this), callback);
};

Bucket.prototype.unlock = function (keys, options, callback) {
// console.log('unlock', arguments);
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    _indexCas(keys, options);

    options.cas = options.cas ? options.cas : {};

    async.each(_array(keys), function __handleEach(key, done) {
        this._bucket.unlock(key, options.cas[key] ? { cas: options.cas[key] } : {}, done);
    }.bind(this), callback);
};

Bucket.prototype.upsert = function (tuples, options, callback) {
// console.log('upsert', arguments);
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    var keys = Object.keys(tuples);

    _indexCas(keys, options);

    var opt = {
        expiry:       options.expiry ? options.expiry : 0,
        persist_to:   options.persist_to ? options.persist_to : 0,
        replicate_to: options.replicate_to ? options.replicate_to : 0
    };

    options.cas = options.cas ? options.cas : {};

    async.each(keys, function __handleEach(key, done) {
        // if there is a cas set for this key, use it.
        if (options.cas[key]) {
            opt.cas = options.cas[key];
        } else {
            delete opt.cas;
        }

        this._bucket.upsert(key, tuples[key], opt, done);
    }.bind(this), callback);
};

module.exports = {
    wrap: function (bucket) {
        return new Bucket(bucket);
    },
    tuple: function (k, v) {
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
    }
};
