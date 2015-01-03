'use strict';

var isArray  = require('util').isArray;
var cbErrors = require('couchbase').errors;
var async    = require('async');

var Bucket = function (bucket) {
    this._bucket = bucket;
};

// -----------------------------------------------------------------------------

function _mergeResults(keys, results, cb) {
    var res   = {},
        total = keys.length,
        i;

    for (i = 0; i < total; i++) {
        res[keys[i]] = results[i];
    }

    return setImmediate(cb.bind(null, null, res));
}

function _handleResults(keys, callback, err, results) {
    if (err) {
        return callback(err);
    }

    return _mergeResults(keys, results, callback);
}

// -----------------------------------------------------------------------------

Bucket.prototype.append = function (key, fragment, options, callback) {
    return this._bucket.append(key, fragment, options, callback);
};

Bucket.prototype.counter = function (key, delta, options, callback) {
    return this._bucket.counter(key, delta, options, callback);
};

Bucket.prototype.get = function (keys, callback) {
    if (!isArray(keys)) {
        keys = [keys];
    }

    this._bucket.getMulti(keys, function __handleGetMulti(err, data) {
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

        return setImmediate(callback.bind(null, null, res));
    });
};

Bucket.prototype.getAndLock = function (keys, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    if (!isArray(keys)) {
        keys = [keys];
    }

    async.each(keys, function (key, done) {
        return this._bucket.getAndLock(key, options, done);
    }.bind(this), _handleResults.bind(null, keys, callback));
};

Bucket.prototype.getAndTouch = function (keys, expiry, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    if (!isArray(keys)) {
        keys = [keys];
    }

    async.each(keys, function (key, done) {
        this._bucket.getAndTouch(key, expiry, options, done);
    }.bind(this), _handleResults.bind(null, keys, callback));
};

Bucket.prototype.getReplica = function (keys, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    if (!isArray(keys)) {
        keys = [keys];
    }

    async.each(keys, function (key, done) {
        this._bucket.getReplica(key, (options.index && options.index[key] ? { index: options.index[key] } : {}), done);
    }.bind(this), _handleResults.bind(null, keys, callback));
};

Bucket.prototype.insert = function (tuples, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    if (!isArray(tuples)) {
        tuples = [tuples];
    }

    async.each(Object.keys(tuples), function (key, done) {
        this._bucket.insert(key, tuples[key], options, done);
    }.bind(this), callback);
};

Bucket.prototype.prepend = function (key, fragment, options, callback) {
    return this._bucket.prepend(key, fragment, options, callback);
};

Bucket.prototype.query = function (query, params, callback) {
    return this._bucket.query(query, params, callback);
};

/**
 * Delete documents from server.
 *
 * @param  {array}     keys      An array of keys to delete.
 * @param  {object}    options   Can contain `persist_to`, `replicate_to`, and `cas`, which should be an object with the key and respective CAS token.
 * @param  {Function}  callback  The callback
 */
Bucket.prototype.remove = function (keys, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    if (!isArray(keys)) {
        keys = [keys];
    }

    var opt = {
        persist_to:   options.persist_to ? options.persist_to : 0,
        replicate_to: options.replicate_to ? options.replicate_to : 0
    };

    options.cas = options.cas ? options.cas : {};

    async.each(keys, function __handleEachKey(key, cb) {
        // if there is a cas set for this key, use it.
        if (options.cas[key]) {
            opt.cas = options.cas[key];
        } else {
            delete opt.cas;
        }

        this._bucket.remove(key, opt, function __handleRemoveKey(err) {
            // ignore keyNotFound errors, remove should be idempotent
            if (err && err.code !== cbErrors.keyNotFound) {
                return setImmediate(cb.bind(null, err));
            }

            return setImmediate(cb);
        });
    }.bind(this), _handleResults.bind(null, keys, callback));
};

Bucket.prototype.replace = function (tuples, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    if (!isArray(tuples)) {
        tuples = [tuples];
    }

    var opt = {
        expiry:       options.expiry ? options.expiry : 0,
        persist_to:   options.persist_to ? options.persist_to : 0,
        replicate_to: options.replicate_to ? options.replicate_to : 0
    };

    options.cas = options.cas ? options.cas : {};

    async.each(Object.keys(tuples), function (key, done) {
        // if there is a cas set for this key, use it.
        if (options.cas[key]) {
            opt.cas = options.cas[key];
        } else {
            delete opt.cas;
        }

        this._bucket.replace(key, tuples[key], opt, done);
    }.bind(this), callback);
};

Bucket.prototype.touch = function (keys, expiry, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    if (!isArray(keys)) {
        keys = [keys];
    }

    async.each(keys, function (key, done) {
        this._bucket.touch(key, expiry, options, done);
    }.bind(this), callback);
};

Bucket.prototype.unlock = function (keys, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    if (!isArray(keys)) {
        keys = [keys];
    }

    options.cas = options.cas ? options.cas : {};

    async.each(keys, function (key, done) {
        this._bucket.unlock(key, options.cas[key] ? { cas: options.cas[key] } : {}, done);
    }.bind(this), callback);
};

Bucket.prototype.upsert = function (tuples, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    if (!isArray(tuples)) {
        tuples = [tuples];
    }

    var opt = {
        expiry:       options.expiry ? options.expiry : 0,
        persist_to:   options.persist_to ? options.persist_to : 0,
        replicate_to: options.replicate_to ? options.replicate_to : 0
    };

    options.cas = options.cas ? options.cas : {};

    async.each(Object.keys(tuples), function (key, done) {
        // if there is a cas set for this key, use it.
        if (options.cas[key]) {
            opt.cas = options.cas[key];
        } else {
            delete opt.cas;
        }

        this._bucket.upsert(key, tuples[key], opt, done);
    }.bind(this), callback);
};

module.exports = function (bucket) {
    return new Bucket(bucket);
};
