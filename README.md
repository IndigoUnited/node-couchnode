# Couchnode

Sane Couchbase bucket interface for handling common operations the right way.

[![Build Status](https://travis-ci.org/IndigoUnited/node-couchnode.svg?branch=master)](https://travis-ci.org/IndigoUnited/node-couchnode)

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

- [`bucket`](#bucket)
- [`append`](#append)
- [`counter`](#counter)
- [`get`](#get)
- [`getAndLock`](#getAndLock)
- [`getAndTouch`](#getAndTouch)
- [`getReplica`](#getReplica)
- [`insert`](#insert)
- [`prepend`](#prepend)
- [`query`](#query)
- [`remove`](#remove)
- [`replace`](#replace)
- [`touch`](#touch)
- [`unlock`](#unlock)
- [`upsert`](#upsert)


<a name="bucket"></a>
### bucket

There is a `.bucket` property on the `couchnode` bucket, which will refer to the underlying official `bucket`.

<a name="append"></a>
### append(keys, fragment, [options,] callback)

- `keys`: array or string
- `fragment`: string
- `options`: object
    - `cas`
    - `persist_to`
    - `replicate_to`
- `callback(err, cas, misses)`
    - `cas`: object with keys and respective CAS token.
    - `misses`: array of keys that don't exist.

<a name="counter"></a>
### counter(keys, delta, [options,] callback)

- `keys`: array or string
- `delta`: non-zero integer
- `options`: object
    - `initial`
    - `expiry`
    - `persist_to`
    - `replicate_to`
- `callback(err, results, cas, misses)`
    - `results`: object with keys and respective values.
    - `cas`: object with keys and respective CAS token.
    - `misses`: array of keys that don't exist.

<a name="get"></a>
### get(keys, callback)

- `keys`: array or string
- `callback(err, results, cas, misses)`
    - `results`: object with keys and respective values.
    - `cas`: object with keys and respective CAS token.
    - `misses`: array of keys that don't exist.

<a name="getAndLock"></a>
### getAndLock(keys, [options,] callback)

- `keys`: array or string
- `options`: object
    - `lockTime`
- `callback(err, results, cas, misses)`
    - `results`: object with keys and respective values.
    - `cas`: object with keys and respective CAS token.
    - `misses`: array of keys that don't exist.

<a name="getAndTouch"></a>
### getAndTouch(keys, expiry, [options,] callback)

- `keys`: array or string
- `expiry`: number
- `options`: object. No options at this time, just keeping consistent with official module, but might deprecate this.
- `callback(err, results, cas, misses)`
    - `results`: object with keys and respective values.
    - `cas`: object with keys and respective CAS token.
    - `misses`: array of keys that don't exist.

<a name="getReplica"></a>
### getReplica(keys, [options,] callback)

- `keys`: array or string
- `options`: object
    - `index`
- `callback(err, results, cas, misses)`
    - `results`: object with keys and respective values.
    - `cas`: object with keys and respective CAS token.
    - `misses`: array of keys that don't exist.

<a name="insert"></a>
### insert(tuples, [options,] callback)

- `tuples`: tuple (object with keys and respective values)
- `options`: object
    - `expiry`
    - `persist_to`
    - `replicate_to`
- `callback(err, cas, existing)`
    - `cas`: object with keys and respective CAS token.
    - `existing`: array of keys that already existed, and thus failed to be added.

<a name="manager"></a>
### manager()

Returns an instance of a BuckerManager for performing management operations against a bucket.

<a name="prepend"></a>
### prepend(keys, fragment, [options,] callback)

- `keys`: array or string
- `fragment`: string
- `options`: object
    - `cas`
    - `persist_to`
    - `replicate_to`
- `callback(err, cas, misses)`
    - `cas`: object with keys and respective CAS token.
    - `misses`: array of keys that don't exist.

<a name="query"></a>
### query(query, params, callback)

- `query`: `ViewQuery` or `N1qlQuery`
- `params`: Object or Array, list or map to do replacements on a N1QL query.
- `callback(err, res)`

<a name="remove"></a>
### remove(keys, [options,] callback)

- `keys`: array or string
- `options`: object
    - `cas`
    - `persist_to`
    - `replicate_to`
- `callback(err, cas, misses)`
    - `cas`: object with keys and respective CAS token.
    - `misses`: array of keys that didn't exist.

<a name="replace"></a>
### replace(tuples, [options,] callback)

- `tuples`: tuple (object with keys and respective values)
- `options`: object
    - `cas`
    - `expiry`
    - `persist_to`
    - `replicate_to`
- `callback(err, cas, misses)`
    - `cas`: object with keys and respective CAS token.
    - `misses`: array of keys that don't exist.

<a name="touch"></a>
### touch(keys, expiry, [options,] callback)

- `keys`: array or string
- `expiry`: integer
- `options`: object
    - `persist_to`
    - `replicate_to`
- `callback(err, cas, misses)`
    - `cas`: object with keys and respective CAS token.
    - `misses`: array of keys that didn't exist.

<a name="unlock"></a>
### unlock(keys, cas, callback)

- `keys`: array or string
- `cas`: integer or key indexed object with keys as respective CAS tokens.
- `callback(err, results, misses)`
    - `results`: `true` or `false` if the key was unlocked or not respectively.
    - `misses`: array of keys that didn't exist.

<a name="upsert"></a>
### upsert(tuples, [options,] callback)

- `tuples`: tuple (object with keys and respective values)
- `options`: object
    - `cas`
    - `expiry`
    - `persist_to`
    - `replicate_to`
- `callback(err, cas)`
    - `cas`: object with keys and respective CAS token.

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

### Per key options

Any time you need to provide key specific options, like `case` or `index` (for `getReplica`), you can provide it as a key indexed object. Check the example below:

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
