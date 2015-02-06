'use strict';

var isArray  = require('util').isArray;
var cbErrors = require('couchbase').errors;
var async    = require('async');

var Bucket = function (bucket) {
    this.bucket = bucket;
};

// -----------------------------------------------------------------------------

function _handleResult(callback, err, res) {
    return callback(null, {
        error:  err,
        result: res
    });
}

function _handleMultiResults(config, callback, err, results) {
    // err should never be present, as multi errors are in the results, but just in case
    if (err) {
        throw err;
        // return setImmediate(callback.bind(null, err));
    }

    return _parseResults(config, results, function __handleMapKeysToResults(err, values, cas, misses) {
        // prepare callback, and curry with error
        var cb = callback.bind(null, err);

        // if should return the values, curry the callback
        if (config.extractValues) {
            cb = cb.bind(null, values);
        }

        // if should return cas, curry the callback
        if (config.extractCas) {
            cb = cb.bind(null, cas);
        }

        // callback with misses
        return setImmediate(cb.bind(null, misses));
    });
}

function _parseResults(config, results, callback) {
    var keysArray = _array(config.keys),
        values    = {},
        cas       = {},
        total     = keysArray.length,
        i,
        k,
        v,
        misses    = [],
        err       = null;

    // for each key
    for (i = 0; i < total; i++) {
        k = keysArray[i];
        v = results[i];

        // if there was an error
        if (v.error) {
            // if the error was keyNotFound, key was a miss
            if (v.error.code === cbErrors.keyNotFound /*|| v.error.message === 'key not found'*/) {
                misses.push(k);
            } else {
                // if no error was initialized yet, init it
                if (!err) {
                    err        = new Error('Some keys generated error. Check .errors property of this Error.');
                    err.code   = 'EMULTI';
                    err.errors = {};
                }

                // key index the error
                err.errors[k] = v.error; // TODO: test in each operation type these errors, and guarantee that they are showing up.
            }
        } else { // no error, just extract the CAS and value
            if (config.extractCas) {
                cas[k] = v.result.cas;
            }

            if (config.extractValues) {
                values[k] = v.result.value;
            }
        }
    }

    return setImmediate(callback.bind(null, err, values, cas, misses));
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

Bucket.prototype.errors = cbErrors;

Bucket.prototype.append = function (keys, fragment, options, callback) {
// console.log('append', arguments);
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

        this.bucket.append(key, fragment, opt, function __handleAppend(err, res) {
            if (err && err.code === 18) { // when a key doesn't exist, error 18 / LIBCOUCHBASE_NOT_SUPPORTED is returned
                err      = new Error('key not found');
                err.code = cbErrors.keyNotFound;

                return _handleResult(done, err);
            }

            return _handleResult(done, err, res);
        });
    }.bind(this), _handleMultiResults.bind(null, {
        keys:          keys,
        extractValues: false,
        extractCas:    true
    }, callback));
};

Bucket.prototype.counter = function (keys, delta, options, callback) {
// console.log('counter', arguments);
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    _indexProperty('cas', keys, options);

    var opt = {
        initial:      options.initial ? options.initial : undefined,
        expiry:       options.expiry ? options.expiry : 0,
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

        this.bucket.counter(key, delta, opt, _handleResult.bind(null, done));
    }.bind(this), _handleMultiResults.bind(null, {
        keys:          keys,
        extractValues: true,
        extractCas:    true
    }, callback));
};

Bucket.prototype.get = function (keys, callback) {
// console.log('get', arguments);
    async.map(_array(keys), function __handleMap(key, done) {
        return this.bucket.get(key, _handleResult.bind(null, done));
    }.bind(this), _handleMultiResults.bind(null, {
        keys:          keys,
        extractValues: true,
        extractCas:    true
    }, callback));
};

Bucket.prototype.getAndLock = function (keys, options, callback) {
// console.log('getAndLock', arguments);
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    async.map(_array(keys), function __handleMap(key, done) {
        return this.bucket.getAndLock(key, options, _handleResult.bind(null, done));
    }.bind(this), _handleMultiResults.bind(null, {
        keys:          keys,
        extractValues: true,
        extractCas:    true
    }, callback));
};

Bucket.prototype.getAndTouch = function (keys, expiry, options, callback) {
// console.log('getAndTouch', arguments);
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    async.map(_array(keys), function __handleMap(key, done) {
        this.bucket.getAndTouch(key, expiry, options, _handleResult.bind(null, done));
    }.bind(this), _handleMultiResults.bind(null, {
        keys:          keys,
        extractValues: true,
        extractCas:    true
    }, callback));
};

Bucket.prototype.getReplica = function (keys, options, callback) {
// console.log('getReplica', arguments);
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    _indexProperty('index', keys, options);

    async.map(_array(keys), function __handleMap(key, done) {
        this.bucket.getReplica(key, (options.index && options.index[key] ? { index: options.index[key] } : {}), _handleResult.bind(null, done));
    }.bind(this), _handleMultiResults.bind(null, {
        keys:          keys,
        extractValues: true,
        extractCas:    true
    }, callback));
};

Bucket.prototype.insert = function (tuples, options, callback) {
// console.log('insert', arguments);
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    var keys = Object.keys(tuples);

    async.map(keys, function __handleMap(key, done) {
        this.bucket.insert(key, tuples[key], options, _handleResult.bind(null, done));
    }.bind(this), _handleMultiResults.bind(null, {
        keys:          keys,
        extractValues: false,
        extractCas:    true
    }, function __handleInsertResult(err, res) {
        var existing = [];

        // find "already existing keys"
        if (err && err.code === 'EMULTI') {
            for (var key in err.errors) {
                if (err.errors[key].code === cbErrors.keyAlreadyExists) {
                    existing.push(key);

                    // hide this error
                    delete err.errors[key];
                }
            }

            // if no error lasted, absorve error
            if (Object.keys(err.errors).length === 0) {
                err = null;
            }
        }

        return callback(err, res, existing);
    }));
};

Bucket.prototype.manager = function () {
    return this.bucket.manager();
};

Bucket.prototype.prepend = function (keys, fragment, options, callback) {
// console.log('prepend', arguments);
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

        this.bucket.prepend(key, fragment, opt, function __handleAppend(err, res) {
            if (err && err.code === 18) { // when a key doesn't exist, error 18 / LIBCOUCHBASE_NOT_SUPPORTED is returned
                err      = new Error('key not found');
                err.code = cbErrors.keyNotFound;

                return _handleResult(done, err);
            }

            return _handleResult(done, err, res);
        });
    }.bind(this), _handleMultiResults.bind(null, {
        keys:          keys,
        extractValues: false,
        extractCas:    true
    }, callback));
};

Bucket.prototype.query = function (query, params, callback) {
// console.log('query', arguments);
    return this.bucket.query(query, params, callback);
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

        this.bucket.remove(key, opt, _handleResult.bind(null, done));
    }.bind(this), _handleMultiResults.bind(null, {
        keys:          keys,
        extractValues: false,
        extractCas:    true
    }, callback));
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
        this.bucket.replace(key, tuples[key], opt, _handleResult.bind(null, done));
    }.bind(this), _handleMultiResults.bind(null, {
        keys:          keys,
        extractValues: false,
        extractCas:    true
    }, callback));
};

Bucket.prototype.touch = function (keys, expiry, options, callback) {
// console.log('touch', arguments);
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    async.map(_array(keys), function __handleMap(key, done) {
        this.bucket.touch(key, expiry, options, _handleResult.bind(null, done));
    }.bind(this), _handleMultiResults.bind(null, {
        keys:          keys,
        extractValues: false,
        extractCas:    true
    }, callback));
};

Bucket.prototype.unlock = function (keys, cas, callback) {
// console.log('unlock', arguments);

    var tokens = { cas: cas };

    _indexProperty('cas', keys, tokens);

    async.map(_array(keys), function __handleEach(key, done) {

        this.bucket.unlock(key, tokens.cas[key], function (err) {
            _handleResult(done, err, { value: !err || err.code === cbErrors.keyNotFound });
        });
    }.bind(this), _handleMultiResults.bind(null, {
        keys:          keys,
        extractValues: true,
        extractCas:    false
    }, callback));
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

        this.bucket.upsert(key, tuples[key], opt, _handleResult.bind(null, done));
    }.bind(this), _handleMultiResults.bind(null, {
        keys:          keys,
        extractValues: false,
        extractCas:    true
    }, callback));
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
