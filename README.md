# Couchnode

Sane Couchbase bucket interface for handling common operations the right way.

[![Build Status](https://travis-ci.org/IndigoUnited/node-couchnode.svg?branch=master)](https://travis-ci.org/IndigoUnited/node-couchnode) [![Coverage Status](https://coveralls.io/repos/IndigoUnited/node-couchnode/badge.svg)](https://coveralls.io/r/IndigoUnited/node-couchnode)

[![Couchnode - Wrapper for the official Couchbase bucket interface](logo.png)](https://travis-ci.org/IndigoUnited/node-couchnode)

This module is as a wrapper for the official bucket interface. Documentation of
the official module can be found
[here](http://docs.couchbase.com/sdk-api/couchbase-node-client-2.0.3/Bucket.html).

Considering this module wraps the official Couchbase interface, it is compatible with the same server versions as the official module.

### Coverage summary

```
Statements   : 91.1% ( 174/191 )
Branches     : 75.2% ( 94/125 )
Functions    : 90% ( 36/40 )
Lines        : 91.1% ( 174/191 )
```

## Rant

Couchbase's official bucket interface contains a bunch of questionable design
options that make common operations very cumbersome to handle. Check below some
examples:

- A common operation is to try to get a key and expect it to potentially not
be there. Unfortunately, the official client handles this as a failure, and
returns an `Error` in the callback, meaning you have to constantly to check if
the error code is not `couchbase.errors.keyNotFound`. JavaScript has an
`undefined` type, which could be leveraged for these scenarios.

- In a `getMulti` scenario, the `keyNotFound` issue is even more troublesome,
in which instead of an `Error`, they return a `Number` stating the amount
of errors that occurred, and you have to iterate through the results looking for
the `.error` property in each result and comparing it to
`couchbase.errors.keyNotFound`.

- When `remove`ing a key, the operation will callback with an `Error` if the key
doesn't exist. Just like the `get` problem, this becomes cumbersome, as you keep
checking for `keyNotFound` codes. You often want removes to be idempotent, and
the result of the operation could have been easily returned as the second
parameter.

- Most operations are not *multi friendly*. By this, I mean you have to
constantly do async control flow of multiple operations, which becomes very
repetitive, and prone to error. Operations could have a stronger *multi
operation* support, like multi insert, multi replace, etc.

- `CAS` failures are treated different ways between different operations. If you
specify no CAS or wrong CAS during a lock in an upsert, you get a
`keyAlreadyExists`, but if you try to `unlock` a key with the wrong CAS, you get
a `temporaryError`.

- `append`ing / `prepend`ing to an inexistent key will generate an `Error` with
code `18`, which isn't even properly documented, but with some exploring you
discover that it is `LIBCOUCHBASE_NOT_SUPPORTED`, even though there is already
a `keyNotFound` error code.

- When `insert`ing keys, if they already exist, you have to constantly look into the `error.code` and look for `keyAlreadyExists`, which again is cumbersome.

## Installing

`npm install couchnode`

## Introduction

The *rant* should give you a good understanding of the motivation behind this
module. Check below some simple usage examples.

```js
var couchbase = require('couchbase');
var cluster   = new couchbase.Cluster('127.0.0.1:8091');

var couchnode = require('couchnode');
var bucket    = couchnode.wrap(cluster.openBucket('default'));

bucket.get(['a', 'b', 'c'], function (err, res, cas, misses) {
    if (err) {
        // err.errors will be an object of keys and respective errors
        return console.error('Something went wrong:', err.errors);
    }

    if (misses.length > 1) {
        console.log('These keys do not exist:', misses);
    } else {
        console.log(res.a, cas.a);
        console.log(res.b, cas.b);
        console.log(res.c, cas.c);
    }
});
```

## API

- **Miscellaneous**
    - [`bucket`](#bucket)
    - [`disconnect`](#disconnect)
    - [`manager`](#manager)
    - [`query`](#query)
    - [`viewQuery`](#viewQuery)
        - [`Update`](#viewQueryUpdate)
        - [`Order`](#viewQueryOrder)
        - [`ErrorMode`](#viewQueryErrorMode)
- **Key/value operations**
    - [`append`](#append)
    - [`counter`](#counter)
    - [`get`](#get)
    - [`getAndLock`](#getAndLock)
    - [`getAndTouch`](#getAndTouch)
    - [`getReplica`](#getReplica)
    - [`insert`](#insert)
    - [`prepend`](#prepend)
    - [`remove`](#remove)
    - [`replace`](#replace)
    - [`touch`](#touch)
    - [`unlock`](#unlock)
    - [`upsert`](#upsert)
- **BucketManager:**
    - [`flush`](#flush)
    - [`getDesignDocument`](#getDesignDocument)
    - [`getDesignDocuments`](#getDesignDocuments)
    - [`insertDesignDocument`](#insertDesignDocument)
    - [`removeDesignDocument`](#removeDesignDocument)
    - [`upsertDesignDocument`](#upsertDesignDocument)
- **ViewQuery:**
    - [`custom`](#custom)
    - [`from`](#from)
    - [`full_set`](#full_set)
    - [`group`](#group)
    - [`group_level`](#group_level)
    - [`id_range`](#id_range)
    - [`key`](#key)
    - [`keys`](#keys)
    - [`limit`](#limit)
    - [`on_error`](#on_error)
    - [`order`](#order)
    - [`range`](#range)
    - [`reduce`](#reduce)
    - [`skip`](#skip)
    - [`stale`](#stale)

### Miscellaneous

<a name="bucket"></a>
#### `bucket`

There is a `.bucket` property on the `couchnode` bucket, which will refer to the underlying official `bucket`.

<a name="disconnect"></a>
#### `disconnect() → Bucket`

Shuts down this connection.

<a name="manager"></a>
#### `manager() → BucketManager`

Returns an instance of a `BucketManager` for performing management operations against a bucket.

<a name="query"></a>
#### `query(query, params, callback) → Bucket`

Executes a previously prepared query object. This could be a `ViewQuery` or a `N1qlQuery`.

- `query`: `ViewQuery` or `N1qlQuery`
- `params`: Object or Array, list or map to do replacements on a N1QL query.
- `callback(err, res)`

<a name="viewQuery"></a>
#### `viewQuery(ddoc, name) → ViewQuery`

TODO

<a name="viewQueryUpdate"></a>
#### `viewQuery.Update`

TODO

- `BEFORE`
- `NONE` (default)
- `AFTER`

<a name="viewQueryOrder"></a>
#### `viewQuery.Order`

TODO

- `ASCENDING` (default)
- `DESCENDING`

<a name="viewQueryErrorMode"></a>
#### `viewQuery.ErrorMode`

TODO

- `CONTINUE` (default)
- `STOP`

### Key/value operations

<a name="append"></a>
#### `append(keys, fragment, [options,] callback) → Bucket`

Similar to [`upsert`](#upsert), but instead of setting new keys, it appends data to the end of the existing keys. Note that this function only makes sense when the stored data is a string. `append`ing to a JSON document may result in parse errors when the document is later retrieved.

- `keys`: array or string
- `fragment`: string
- `options`: object
    - `cas`: The CAS value to check. If the key on the server contains a different CAS value, the operation will fail. Note that if this option is `undefined`, no comparison will be performed. For details on passing the CAS token for each of the keys, check [Per key options](#per-key-options).
    - `persist_to` (default `0`): Ensure this operation is persisted to this many nodes.
    - `replicate_to` (default `0`): Ensure this operation is replicated to this many nodes.
- `callback(err, cas, misses)`
    - `cas`: object with keys and respective CAS token.
    - `misses`: array of keys that don't exist.

<a name="counter"></a>
#### `counter(keys, delta, [options,] callback) → Bucket`

Increments or decrements the keys' numeric value.

Note that JavaScript does not support 64-bit integers (while libcouchbase and the server do). You might receive an inaccurate value if the number is greater than 53-bits (JavaScript's maximum integer precision).

- `keys`: array or string
- `delta`: non-zero integer
- `options`: object
    - `initial`: Initial value for the key if it does not exist. Specifying a value of `undefined` will cause the operation to fail if key doesn't exist, otherwise this value must be equal to or greater than `0`.
    - `expiry` (default `0`): Expiration time of the key. If it's equal to zero, the item will never expire. You can also use Unix timestamp or a number of seconds starting from current time, but in the latter case the number of seconds may not exceed 2592000 (30 days).
    - `persist_to` (default `0`): Ensure this operation is persisted to this many nodes.
    - `replicate_to` (default `0`): Ensure this operation is replicated to this many nodes.
- `callback(err, results, cas, misses)`
    - `results`: object with keys and respective values.
    - `cas`: object with keys and respective CAS token.
    - `misses`: array of keys that don't exist.

<a name="get"></a>
#### `get(keys, callback) → Bucket`

Retrieve keys.

- `keys`: array or string
- `callback(err, results, cas, misses)`
    - `results`: object with keys and respective values.
    - `cas`: object with keys and respective CAS token.
    - `misses`: array of keys that don't exist.

<a name="getAndLock"></a>
#### `getAndLock(keys, [options,] callback) → Bucket`

Lock the keys on the server and retrieve them. When a key is locked, its CAS changes and subsequent operations (without providing the current CAS) will fail until the lock is no longer held.

This function behaves identically to [`get`](#get) in that it will return the value. It differs in that the key is also locked. This ensures that attempts by other client instances to access this key while the lock is held will fail.

Once locked, a key can be unlocked either by explicitly calling [`unlock`](#unlock) or by performing a storage operation (e.g. [`upsert`](#upsert), [`replace`](#replace), [`append`](#append)) with the current CAS value. Note that any other lock operations on this key will fail while a document is locked.

- `keys`: array or string
- `options`: object
    - `lockTime`
- `callback(err, results, cas, misses)`
    - `results`: object with keys and respective values.
    - `cas`: object with keys and respective CAS token.
    - `misses`: array of keys that don't exist.

<a name="getAndTouch"></a>
#### `getAndTouch(keys, expiry, [options,] callback) → Bucket`

Retrieve keys and updates the expiry at the same time.

- `keys`: array or string
- `expiry` (default `0`): Expiration time of the key. If it's equal to zero, the item will never expire. You can also use Unix timestamp or a number of seconds starting from current time, but in the latter case the number of seconds may not exceed 2592000 (30 days). number
- `options`: object. No options at this time, just keeping consistent with official module, but might deprecate this.
- `callback(err, results, cas, misses)`
    - `results`: object with keys and respective values.
    - `cas`: object with keys and respective CAS token.
    - `misses`: array of keys that don't exist.

<a name="getReplica"></a>
#### `getReplica(keys, [options,] callback) → Bucket`

Get keys from replica servers in your cluster.

- `keys`: array or string
- `options`: object
    - `index`: The index for which replica you wish to retrieve this value from, or if undefined, use the value from the first server that replies.
- `callback(err, results, cas, misses)`
    - `results`: object with keys and respective values.
    - `cas`: object with keys and respective CAS token.
    - `misses`: array of keys that don't exist.

<a name="insert"></a>
#### `insert(tuples, [options,] callback) → Bucket`

Identical to [`upsert`](#upsert) but will fail if the key already exists. Any key that already exists is returned in the callback in the `existing` parameter.

- `tuples`: tuple (object with keys and respective values)
- `options`: object
    - `expiry` (default `0`): Expiration time of the key. If it's equal to zero, the item will never expire. You can also use Unix timestamp or a number of seconds starting from current time, but in the latter case the number of seconds may not exceed 2592000 (30 days).
    - `persist_to` (default `0`): Ensure this operation is persisted to this many nodes.
    - `replicate_to` (default `0`): Ensure this operation is replicated to this many nodes.
- `callback(err, cas, existing)`
    - `cas`: object with keys and respective CAS token.
    - `existing`: array of keys that already existed, and thus failed to be added.

<a name="prepend"></a>
#### `prepend(keys, fragment, [options,] callback) → Bucket`

Like [`append`](#append), but prepends data to the existing value.

- `keys`: array or string
- `fragment`: string
- `options`: object
    - `cas`: The CAS value to check. If the key on the server contains a different CAS value, the operation will fail. Note that if this option is `undefined`, no comparison will be performed. For details on passing the CAS token for each of the keys, check [Per key options](#per-key-options).
    - `persist_to` (default `0`): Ensure this operation is persisted to this many nodes.
    - `replicate_to` (default `0`): Ensure this operation is replicated to this many nodes.
- `callback(err, cas, misses)`
    - `cas`: object with keys and respective CAS token.
    - `misses`: array of keys that don't exist.

<a name="remove"></a>
#### `remove(keys, [options,] callback) → Bucket`

Delete keys on the server.

- `keys`: array or string
- `options`: object
    - `cas`: The CAS value to check. If the key on the server contains a different CAS value, the operation will fail. Note that if this option is `undefined`, no comparison will be performed. For details on passing the CAS token for each of the keys, check [Per key options](#per-key-options).
    - `persist_to` (default `0`): Ensure this operation is persisted to this many nodes.
    - `replicate_to` (default `0`): Ensure this operation is replicated to this many nodes.
- `callback(err, cas, misses)`
    - `cas`: object with keys and respective CAS token.
    - `misses`: array of keys that didn't exist.

<a name="replace"></a>
#### `replace(tuples, [options,] callback) → Bucket`

Identical to [`upsert`](#upsert), but will only succeed if the key exists already (i.e. the inverse of [`insert`](#insert)).

- `tuples`: tuple (object with keys and respective values)
- `options`: object
    - `cas`: The CAS value to check. If the key on the server contains a different CAS value, the operation will fail. Note that if this option is `undefined`, no comparison will be performed. For details on passing the CAS token for each of the keys, check [Per key options](#per-key-options).
    - `expiry` (default `0`): Expiration time of the key. If it's equal to zero, the item will never expire. You can also use Unix timestamp or a number of seconds starting from current time, but in the latter case the number of seconds may not exceed 2592000 (30 days).
    - `persist_to` (default `0`): Ensure this operation is persisted to this many nodes.
    - `replicate_to` (default `0`): Ensure this operation is replicated to this many nodes.
- `callback(err, cas, misses)`
    - `cas`: object with keys and respective CAS token.
    - `misses`: array of keys that don't exist.

<a name="touch"></a>
#### `touch(keys, expiry, [options,] callback) → Bucket`

Update the keys' expiration time.

- `keys`: array or string
- `expiry` (default `0`): Expiration time of the key. If it's equal to zero, the item will never expire. You can also use Unix timestamp or a number of seconds starting from current time, but in the latter case the number of seconds may not exceed 2592000 (30 days). integer
- `options`: object
    - `persist_to` (default `0`): Ensure this operation is persisted to this many nodes.
    - `replicate_to` (default `0`): Ensure this operation is replicated to this many nodes.
- `callback(err, cas, misses)`
    - `cas`: object with keys and respective CAS token.
    - `misses`: array of keys that didn't exist.

<a name="unlock"></a>
#### `unlock(keys, cas, callback) → Bucket`

Unlock previously locked keys on the server. See the [`getAndLock`](#getAndLock) method for more details on locking.

- `keys`: array or string
- `cas`: The CAS value to check. If the key on the server contains a different CAS value, the operation will fail. Note that if this option is `undefined`, no comparison will be performed. For details on passing the CAS token for each of the keys, check [Per key options](#per-key-options).
- `callback(err, results, misses)`
    - `results`: `true` or `false` if the key was unlocked or not respectively.
    - `misses`: array of keys that didn't exist.

<a name="upsert"></a>
#### `upsert(tuples, [options,] callback) → Bucket`

Stores a key-value to the bucket. If the keys don't exist, they will be created. If they already exist, they will be overwritten.

- `tuples`: tuple (object with keys and respective values)
- `options`: object
    - `cas`: The CAS value to check. If the key on the server contains a different CAS value, the operation will fail. Note that if this option is `undefined`, no comparison will be performed. For details on passing the CAS token for each of the keys, check [Per key options](#per-key-options).
    - `expiry` (default `0`): Expiration time of the key. If it's equal to zero, the item will never expire. You can also use Unix timestamp or a number of seconds starting from current time, but in the latter case the number of seconds may not exceed 2592000 (30 days).
    - `persist_to` (default `0`): Ensure this operation is persisted to this many nodes.
    - `replicate_to` (default `0`): Ensure this operation is replicated to this many nodes.
- `callback(err, cas)`
    - `cas`: object with keys and respective CAS token.

### BucketManager

TODO

<a name="flush"></a>
#### `flush(callback) → BucketManager`

TODO

<a name="getDesignDocument"></a>
#### `getDesignDocument(name, callback) → BucketManager`

TODO

<a name="getDesignDocuments"></a>
#### `getDesignDocuments(callback) → BucketManager`

TODO

<a name="insertDesignDocument"></a>
#### `insertDesignDocument(name, data, callback) → BucketManager`

TODO

<a name="removeDesignDocument"></a>
#### `removeDesignDocument(name, callback) → BucketManager`

TODO

<a name="upsertDesignDocument"></a>
#### `upsertDesignDocument(name, data, callback) → BucketManager`

TODO

### ViewQuery

TODO

<a name="custom"></a>
#### `custom(opts) → ViewQuery`

TODO

<a name="from"></a>
#### `from(ddoc, name) → ViewQuery`

TODO

<a name="full_set"></a>
#### `full_set(full_set) → ViewQuery`

TODO

<a name="group"></a>
#### `group(group) → ViewQuery`

TODO

<a name="group_level"></a>
#### `group_level(group_level) → ViewQuery`

TODO

<a name="id_range"></a>
#### `id_range(start, end) → ViewQuery`

TODO

<a name="key"></a>
#### `key(key) → ViewQuery`

TODO

<a name="keys"></a>
#### `keys(keys) → ViewQuery`

TODO

<a name="limit"></a>
#### `limit(limit) → ViewQuery`

TODO

<a name="on_error"></a>
#### `on_error(mode) → ViewQuery`

TODO

<a name="order"></a>
#### `order(order) → ViewQuery`

TODO

<a name="range"></a>
#### `range(start, end, inclusive_end) → ViewQuery`

TODO

<a name="reduce"></a>
#### `reduce(reduce) → ViewQuery`

TODO

<a name="skip"></a>
#### `skip(skip) → ViewQuery`

TODO

<a name="stale"></a>
#### `stale(stale) → ViewQuery`

TODO

### Error handling

Since all operations support *multi operation*, all operations will return an `Error` with `EMULTI` code as first parameter, in case any of the operations fails. This `Error` contains an `.errors` property, which is an object with keys and respective original `Error`.

### Key Not Found

All `keyNotFound` scenarios are handled the same way, and there is no `Error` generated. Instead, all operations will provide a `misses` array in the callback, and the `results` object won't contain the missing key.

### Tuples

A tuple is an object with key and respective values, like so:

```js
{
    a: 1,
    b: 2,
    c: 3
}
```

Many `couchnode` operations allow you to provide tuples for *multi operations*. As an example, you could provide the tuple above to `insert`, and the keys `a`, `b` and `c` would be inserted with the respective values.

As syntax sugar, and to avoid creating temporary objects like this:

```js
// ...

var someKey   = 'foo';
var someValue = 'bar';
var tmp       = {};
tmp[someKey]  = someValue;
bucket.insert(tmp, function (err, res) {
    // ...
});

// ...
```

You can instead do the following:

```js
// ...

var someKey   = 'foo';
var someValue = 'bar';

var tuple = require('couchnode').tuple;

bucket.insert(tuple(someKey, someValue), function (err, res) {
    // ...
});

//...
```

You can provide to the `tuple` helper just a key and a value, or you can provide a couple of arrays of equal length, and `tuple` will map each of they keys to the respective values, like so:

```js
tuple(['a', 'b', 'c'], [1, 2, 3]);

// will return
//
// {
//   a: 1,
//   b: 2,
//   c: 3
// }
```

<a name="per-key-options"></a>
### Per key options

Any time you need to provide key specific options, like `cas` or `index` (for `getReplica`), you can provide it as a key indexed object. Check the example below:

```js
bucket.upsert({
    foo: 1,
    bar: 2,
}, {
    cas: {
        foo: /* CAS TOKEN GOES HERE */,
        bar: /* CAS TOKEN GOES HERE */
    }
}, function (err, res, misses) {
    // ...
});
```

You do not have to specify options to all keys, `couchnode` will only apply the options to the keys you specify.

### Errors

Error codes are available under `bucket.errors.<code>`. List of codes below.

- `success`                : 0,
- `authContinue`           : 1,
- `authError`              : 2,
- `deltaBadVal`            : 3,
- `objectTooBig`           : 4,
- `serverBusy`             : 5,
- `cLibInternal`           : 6,
- `cLibInvalidArgument`    : 7,
- `cLibOutOfMemory`        : 8,
- `invalidRange`           : 9,
- `cLibGenericError`       : 10,
- `temporaryError`         : 11,
- `keyAlreadyExists`       : 12,
- `keyNotFound`            : 13,
- `failedToOpenLibrary`    : 14,
- `failedToFindSymbol`     : 15,
- `networkError`           : 16,
- `wrongServer`            : 17,
- `notMyVBucket`           : 17,
- `notStored`              : 13,
- `notSupported`           : 19,
- `unknownCommand`         : 20,
- `unknownHost`            : 21,
- `protocolError`          : 22,
- `timedOut`               : 23,
- `connectError`           : 24,
- `bucketNotFound`         : 25,
- `clientOutOfMemory`      : 26,
- `clientTemporaryError`   : 27,
- `badHandle`              : 28,
- `serverBug`              : 29,
- `invalidHostFormat`      : 31,
- `notEnoughNodes`         : 33,
- `duplicateItems`         : 34,
- `noMatchingServerForKey` : 35,
- `badEnvironmentVariable` : 36,
- `outOfMemory`            : undefined,
- `invalidArguments`       : undefined,
- `schedulingError`        : undefined,
- `checkResults`           : undefined,
- `genericError`           : undefined,
- `durabilityFailed`       : undefined,
- `restError`              : undefined

## TODO

- Properly test each of the common error scenarios in each operation type. An insert will fail if key already exists, replace fails if the key doesn't exist, and so on for each operation type.
- Create a better way of signaling a CAS failure. Consider either adding a new error code or attaching a `.casFailure` property to the `Error`.
