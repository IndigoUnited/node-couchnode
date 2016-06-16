# Couchnode

Sane official Couchbase client wrapper for handling multi key and other common operations the right way.

[![Build Status](https://travis-ci.org/IndigoUnited/node-couchnode.svg?branch=master)](https://travis-ci.org/IndigoUnited/node-couchnode) [![Coverage Status](https://coveralls.io/repos/IndigoUnited/node-couchnode/badge.svg)](https://coveralls.io/r/IndigoUnited/node-couchnode) [![Codacy Badge](https://www.codacy.com/project/badge/c3afd76fdaeb49d38df7126b6ae55480)](https://www.codacy.com/app/me_19/node-couchnode)

[![Couchnode - Wrapper for the official Couchbase client](logo.png)](logo.png)

This module is a wrapper for the official client. Documentation of
the official module can be found
[here](http://developer.couchbase.com/documentation/server/4.0/sdks/node-2.0/download-links.html).

Considering this module wraps the official Couchbase client, it is compatible with the same server versions as the official module.

## Rant

Couchbase's official client contains a bunch of questionable design
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

// if the instance passed to `wrap` is already a couchnode bucket, then it
// returns the same instance

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

// let's perform a view query
var query = bucket
    .viewQuery('my_design_doc', 'brewery_beers')
    .range(['a'],['m'], true) // only keys from 'a' to 'm'
    .reduce(false) // do not reduce
    .stale(bucket.viewQuery.Update.BEFORE); // guarantee that view is not stale

bucket.query(query, function (err, res, meta) {
    if (err) {
        return console.error('View query failed:', err);
    }

    console.log('Found', meta.total_rows, 'results:', res);
});
```

Should be noted that even though the main motivator behind this module is an improved API, there is always an effort to maintain the existing API, to reduce friction and learning curve. With this said, the API is typically only changed if the original one becomes too cumbersome to handle on a daily basis.

## API

- **[Miscellaneous](#miscellaneous)**
    - [`bucket`](#bucket_bucket)
    - [`maxReadsPerOp`](#bucket_maxReadsPerOp)
    - [`maxWritesPerOp`](#bucket_maxWritesPerOp)
    - [`disconnect`](#bucket_disconnect)
    - [`manager`](#bucket_manager)
    - [`query`](#bucket_query)
    - [`viewQuery`](#bucket_viewQuery)
        - [`Update`](#viewQuery_Update)
        - [`Order`](#viewQuery_Order)
        - [`ErrorMode`](#viewQuery_ErrorMode)
- **[Key/value operations](#keyValueOperations)**
    - [`append`](#bucket_append)
    - [`counter`](#bucket_counter)
    - [`get`](#bucket_get)
    - [`getAndLock`](#bucket_getAndLock)
    - [`getAndTouch`](#bucket_getAndTouch)
    - [`getReplica`](#bucket_getReplica)
    - [`insert`](#bucket_insert)
    - [`prepend`](#bucket_prepend)
    - [`remove`](#bucket_remove)
    - [`replace`](#bucket_replace)
    - [`touch`](#bucket_touch)
    - [`unlock`](#bucket_unlock)
    - [`upsert`](#bucket_upsert)
- **[BucketManager](#bucketManager)**
    - [`flush`](#bucketManager_flush)
    - [`getDesignDocument`](#bucketManager_getDesignDocument)
    - [`getDesignDocuments`](#bucketManager_getDesignDocuments)
    - [`insertDesignDocument`](#bucketManager_insertDesignDocument)
    - [`removeDesignDocument`](#bucketManager_removeDesignDocument)
    - [`upsertDesignDocument`](#bucketManager_upsertDesignDocument)
- **[ViewQuery](#viewQuery)**
    - [`custom`](#viewQuery_custom)
    - [`from`](#viewQuery_from)
    - [`full_set`](#viewQuery_full_set)
    - [`group`](#viewQuery_group)
    - [`group_level`](#viewQuery_group_level)
    - [`id_range`](#viewQuery_id_range)
    - [`key`](#viewQuery_key)
    - [`keys`](#viewQuery_keys)
    - [`limit`](#viewQuery_limit)
    - [`on_error`](#viewQuery_on_error)
    - [`order`](#viewQuery_order)
    - [`range`](#viewQuery_range)
    - [`reduce`](#viewQuery_reduce)
    - [`skip`](#viewQuery_skip)
    - [`stale`](#viewQuery_stale)

<a name="miscellaneous"></a>
### Miscellaneous

<a name="bucket_bucket"></a>
#### `bucket`

There is a `.bucket` property on the `couchnode` bucket, which will refer to the underlying official `bucket`.

---

<a name="bucket_maxReadsPerOp"></a>
#### `maxReadsPerOp`

Maximum amount of parallel reads per operation, defaults to `0`, which is no limit. Can be used to smooth out spikes at the expense of slowing each operation. As an example, if you set this to `10000` and try to `get` 50k keys, it will be the equivalent of 5 sequential gets of 10k keys.

**WARNING:** If you *need* to rely on this feature, it might be symptomatic of an architectural problem like an implementation issue or an underprovisioned cluster.

---

<a name="bucket_maxWritesPerOp"></a>
#### `maxWritesPerOp`

Maximum amount of parallel writes per operation, defaults to `0`, which is no limit. Can be used to smooth out spikes at the expense of slowing each operation. As an example, if you set this to `10000` and try to `upsert` 50k keys, it will be the equivalent of 5 sequential upserts of 10k keys.

**WARNING:** If you *need* to rely on this feature, it might be symptomatic of an architectural problem like an implementation issue or an underprovisioned cluster.

---

<a name="bucket_disconnect"></a>
#### `disconnect() → Bucket`

Shuts down this connection.

<a name="bucket_manager"></a>
#### `manager() → BucketManager`

Returns an instance of a `BucketManager` for performing management operations against a bucket.

---

<a name="bucket_query"></a>
#### `query(query, [params,] callback) → ViewQueryResponse`

Executes a previously prepared query object. This could be a `ViewQuery` or a `N1qlQuery`.

- `query`: `ViewQuery` or `N1qlQuery`
- `params`: Object or Array, list or map to do replacements on a N1QL query.
- `callback(err, results, meta)`
    - `results`: An array of results, each result will be an object containing `id`, a `key` array and a `value`.
    - `meta`: An object containing `total_rows`.

---

<a name="bucket_viewQuery"></a>
#### `viewQuery(ddoc, name) → ViewQuery`

Instantiates a [`ViewQuery`](#viewQuery) object for the specified design document and view name.

---

<a name="keyValueOperations"></a>
### Key/value operations

<a name="bucket_append"></a>
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

---

<a name="bucket_counter"></a>
#### `counter(keys, delta, [options,] callback) → Bucket`

Increments or decrements the keys' numeric value.

Note that JavaScript does not support 64-bit integers (while libcouchbase and the server do). You might receive an inaccurate value if the number is greater than 53-bits (JavaScript's maximum integer precision).

- `keys`: array or string
- `delta`: non-zero integer
- `options`: object
    - `initial`: Initial value for the key if it does not exist (the actual value that will be used, not added to `delta`). Specifying a value of `undefined` will cause the operation to fail if key doesn't exist, otherwise this value must be equal to or greater than `0`.
    - `expiry` (default `0`): Expiration time of the key. If it's equal to zero, the item will never expire. You can also use Unix timestamp or a number of seconds starting from current time, but in the latter case the number of seconds may not exceed 2592000 (30 days).
    - `persist_to` (default `0`): Ensure this operation is persisted to this many nodes.
    - `replicate_to` (default `0`): Ensure this operation is replicated to this many nodes.
- `callback(err, results, cas, misses)`
    - `results`: object with keys and respective values.
    - `cas`: object with keys and respective CAS token.
    - `misses`: array of keys that don't exist.

---

<a name="bucket_get"></a>
#### `get(keys, callback) → Bucket`

Retrieve keys.

- `keys`: array or string
- `callback(err, results, cas, misses)`
    - `results`: object with keys and respective values.
    - `cas`: object with keys and respective CAS token.
    - `misses`: array of keys that don't exist.

---

<a name="bucket_getAndLock"></a>
#### `getAndLock(keys, [options,] callback) → Bucket`

Lock the keys on the server and retrieve them. When a key is locked, its CAS changes and subsequent write operations without providing the current CAS will fail until the lock is no longer held.

This function behaves identically to [`get`](#get) in that it will return the value. It differs in that the key is also locked. This ensures that attempts by other client instances to write this key while the lock is held will fail.

Once locked, a key can be unlocked either by explicitly calling [`unlock`](#unlock) or by performing a storage operation (e.g. [`upsert`](#upsert), [`replace`](#replace), [`append`](#append)) with the current CAS value. Note that any other lock operations on this key will fail while a document is locked, and the [`.casFailure`](#casFailure) flag will be set.

- `keys`: array or string
- `options`: object
    - `lockTime`
- `callback(err, results, cas, misses)`
    - `results`: object with keys and respective values.
    - `cas`: object with keys and respective CAS token.
    - `misses`: array of keys that don't exist.

---

<a name="bucket_getAndTouch"></a>
#### `getAndTouch(keys, expiry, [options,] callback) → Bucket`

Retrieve keys and updates the expiry at the same time.

- `keys`: array or string
- `expiry` (default `0`): Expiration time of the key. If it's equal to zero, the item will never expire. You can also use Unix timestamp or a number of seconds starting from current time, but in the latter case the number of seconds may not exceed 2592000 (30 days). number
- `options`: object. No options at this time, just keeping consistent with official module, but might deprecate this.
- `callback(err, results, cas, misses)`
    - `results`: object with keys and respective values.
    - `cas`: object with keys and respective CAS token.
    - `misses`: array of keys that don't exist.

---

<a name="bucket_getReplica"></a>
#### `getReplica(keys, [options,] callback) → Bucket`

Get keys from replica servers in your cluster.

- `keys`: array or string
- `options`: object
    - `index`: The index for which replica you wish to retrieve this value from, or if undefined, use the value from the first server that replies.
- `callback(err, results, cas, misses)`
    - `results`: object with keys and respective values.
    - `cas`: object with keys and respective CAS token.
    - `misses`: array of keys that don't exist.

---

<a name="bucket_insert"></a>
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

---

<a name="bucket_prepend"></a>
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

---

<a name="bucket_remove"></a>
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

---

<a name="bucket_replace"></a>
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

---

<a name="bucket_touch"></a>
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

---

<a name="bucket_unlock"></a>
#### `unlock(keys, cas, callback) → Bucket`

Unlock previously locked keys on the server. See the [`getAndLock`](#getAndLock) method for more details on locking.

- `keys`: array or string
- `cas`: The CAS value to check. If the key on the server contains a different CAS value, the operation will fail. Note that if this option is `undefined`, no comparison will be performed. For details on passing the CAS token for each of the keys, check [Per key options](#per-key-options).
- `callback(err, results, misses)`
    - `results`: `true` or `false` if the key was unlocked or not respectively.
    - `misses`: array of keys that didn't exist.

---

<a name="bucket_upsert"></a>
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

---

<a name="bucketManager"></a>
### BucketManager

A class for performing management operations against a bucket. This is the same instance as the official client.

---

<a name="bucketManager_flush"></a>
#### `flush(callback) → BucketManager`

Flushes the cluster, deleting all data stored within this bucket. Note that this method requires the Flush permission to be enabled on the bucket from the management console before it will work.

- `callback(err)`

---

<a name="bucketManager_getDesignDocument"></a>
#### `getDesignDocument(name, callback) → BucketManager`

Retrieves a specific design document from the bucket.

- `name`: The name of the design document.
- `callback(err, doc)`
    - `doc`: The design document. Check [`insertDesignDocument`](#bucketManager_insertDesignDocument) for an example design document.

---

<a name="bucketManager_getDesignDocuments"></a>
#### `getDesignDocuments(callback) → BucketManager`

Retrieves a list of all design documents registered to a bucket.

- `callback(err, docs)`
    - `docs`: An object with all design documents. Check [`insertDesignDocument`](#bucketManager_insertDesignDocument) for an example design document.

---

<a name="bucketManager_insertDesignDocument"></a>
#### `insertDesignDocument(name, doc, callback) → BucketManager`

Registers a design document to this bucket, failing if it already exists.

- `name`: The name of the design document.
- `doc`: The design document. Check below an example.
- `callback(err)`


```js
{
    language: 'javascript',
    views: {
        brewery_beers: {
            map: function (doc, meta) {
                switch (doc.type) {
                case 'brewery':
                    emit([meta.id]);

                    break;
                case 'beer':
                    if (doc.brewery_id) {
                        emit([doc.brewery_id, meta.id]);
                    }

                    break;
                }
            },
            reduce: '_count'
        },
        by_location: {
            map: function (doc, meta) {
                if (doc.country && doc.state && doc.city) {
                    emit([doc.country, doc.state, doc.city], 1);
                } else if (doc.country, doc.state) {
                    emit([doc.country, doc.state], 1);
                } else if (doc.country) {
                    emit([doc.country], 1);
                }
            },
            reduce: '_count'
        }
    }
}
```

---

<a name="bucketManager_removeDesignDocument"></a>
#### `removeDesignDocument(name, callback) → BucketManager`

Unregisters a design document from this bucket.

- `name`: The name of the design document.
- `callback(err)`

---

<a name="bucketManager_upsertDesignDocument"></a>
#### `upsertDesignDocument(name, doc, callback) → BucketManager`

Registers a design document to this bucket, overwriting any existing design document that was previously registered.

- `name`: The name of the design document.
- `doc`: The design document. Check [`insertDesignDocument`](#bucketManager_insertDesignDocument) for an example design document.
- `callback(err)`

---

<a name="viewQuery"></a>
### ViewQuery

Class for dynamic construction of view queries. This is the same instance as the official client.

---

<a name="viewQuery_custom"></a>
#### `custom(opts) → ViewQuery`

Allows you to specify custom view options that may not be available though the fluent interface defined by this class.

- `opts`: An object with options.

---

<a name="viewQuery_from"></a>
#### `from(ddoc, name) → ViewQuery`

Set the design document and view name of this query.

- `ddoc`: Design document name.
- `name`: View name.

---

<a name="viewQuery_full_set"></a>
#### `full_set(full_set) → ViewQuery`

Use the full cluster data set (development views only).

- `full_set`: boolean

---

<a name="viewQuery_group"></a>
#### `group(group) → ViewQuery`

Group the results using the reduce function to a group or single row. Note: Do not use group with group_level because they are not compatible.

- `group`: boolean

---

<a name="viewQuery_group_level"></a>
#### `group_level(group_level) → ViewQuery`

Specify the group level to be used. Note: Do not use `group_level` with `group` because they are not compatible.

- `group_level`: number

---

<a name="viewQuery_id_range"></a>
#### `id_range(start, end) → ViewQuery`

Specify range of document ids to retrieve from the index. Only one is required, but you can limit both. Unlike [range](#viewQuery_range), which limits based on the view key, `id_range` limits based on the original document id.

- `start`: String, return records starting with the specified document ID.
- `end`: String, stop returning records when the specified document ID is reached.

---

<a name="viewQuery_key"></a>
#### `key(key) → ViewQuery`

Return only documents that match the specified key.

- `key`: Array, return only documents that match the specified key.

---

<a name="viewQuery_keys"></a>
#### `keys(keys) → ViewQuery`

Return only documents that match each of keys specified within the given array. Sorting is not applied when using this option.

- `keys`: Array of arrays.

---

<a name="viewQuery_limit"></a>
#### `limit(limit) → ViewQuery`

Limit the number of the returned documents.

- `limit`: Number.

---

<a name="viewQuery_on_error"></a>
#### `on_error(mode) → ViewQuery`

Set the error handling mode for this query.

<a name="viewQuery_ErrorMode"></a>

- `mode`: Available options:
    - `bucket.viewQuery.ErrorMode.CONTINUE` (default): Continue to generate view information in the event of an error, including the error information in the view response stream.
    - `bucket.viewQuery.ErrorMode.STOP`: Stop immediately when an error condition occurs. No further view information is returned.

---

<a name="viewQuery_order"></a>
#### `order(order) → ViewQuery`

Specify ordering for the results.

<a name="viewQuery_Order"></a>

- `order`: Available options:
    - `bucket.viewQuery.Order.ASCENDING` (default): Return the documents in ascending by key order.
    - `bucket.viewQuery.Order.DESCENDING`: Return the documents in descending by key order.

---

<a name="viewQuery_range"></a>
#### `range(start, end, inclusive_end) → ViewQuery`

Specify range of keys to retrieve from the index. Only one is required, but you can limit both. Unlike [id_range](#viewQuery_id_range), which limits based on the original document id, `range` limits based on the view key.

- `start`: String, return records starting with the specified document ID.
- `end`: String, stop returning records when the specified document ID is reached.
- `inclusive_end` (default `true`): Boolean, specifies whether the specified end key is included in the result. Note: Do not use `inclusive_end` with `key` or `keys`.

---

<a name="viewQuery_reduce"></a>
#### `reduce(reduce) → ViewQuery`

Specify if should use the reduction function.

- `reduce` (default `true`): Boolean.

---

<a name="viewQuery_skip"></a>
#### `skip(skip) → ViewQuery`

Specify how many results to skip from the beginning of the result set.

- `skip`: Number.

---

<a name="viewQuery_stale"></a>
#### `stale(stale) → ViewQuery`

Specifies how this query will affect view indexing, both before and after the query is executed.

<a name="viewQuery_Update"></a>

- `stale`: Available options:
    - `bucket.viewQuery.Update.BEFORE`: The server waits for the indexer to finish the changes that correspond to the current key-value document set and then returns the latest entries from the view index.
    - `bucket.viewQuery.Update.NONE` (default): The server returns the current entries from the index file including the stale views.
    - `bucket.viewQuery.Update.AFTER`: The server returns the current entries from the index, and then initiates an index update.

---

### Error handling

Since all operations support *multi operation*, all operations will return an `Error` with `EMULTI` code as first parameter, in case any of the operations fails. This `Error` contains an `.errors` property, which is an object with keys and respective original `Error`.

<a name="casFailure"></a>
### CAS failures

As a way to make it easier to check if a CAS failure happened in your operation, you can check the `error.casFailure` property. If it is `truthy`, then a CAS failure happened. If it is `falsy`, then there was no CAS failure.

Here's an example usage:

```js
bucket.upsert({ my_key: 10 }, { cas: /* CAS VALUE */ }, function (err, cas) {
    if (err && err.errors.my_key && err.errors.my_key.casFailure) {
        // this was a CAS failure
    }
});
```

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

Error codes are available under `bucket.errors.<code>` and `couchnode.errors.<code>`. List of codes below.

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
- Consider improving BucketManager:
    - Support multiple operations.
    - Improve "callback" mechanism after doing certain operations. It seems to callback before the views are ready.
- Consider improving ViewQuery, as it is using "new concepts" that are different from the specified in the Couchbase documentation. I see no need for this, as the original concepts are pretty clear. Example: `descending` is called `order`, and you need to use *pseudo-constants*, even though you could just used `descending: true/false`.
- Document how to check if design document exists. Maybe even improve error code.

## Contributing

If you'd like to contribute to `couchnode`, first of all *yay!*. Now, you should fork this repository, and once you `npm install`, you will need to get yourself a Couchbase server or you'll need to install the [`CouchbaseMock`](https://github.com/couchbase/CouchbaseMock) server (instructions on how to install below).

```bash
# CouchbaseMock is a Java implementation of the Couchbase server, and is
# intended to be used as a mock server for testing.

# make sure you have the following installed:
# libcouchbase-dev libcouchbase2-core libcouchbase2-libevent
# libevent-dev openjdk-7-jdk maven

# build server from source
git clone git://github.com/couchbase/CouchbaseMock /tmp/CouchbaseMock
pushd /tmp/CouchbaseMock
mvn package
popd

# run the server in the background
java -jar /tmp/CouchbaseMock/target/CouchbaseMock-*.jar &
```

By default, the tests will run against the bucket `default` on `127.0.0.1`. To override this, use the ENV vars: `COUCHBASE_HOST` and `COUCHBASE_BUCKET`. Example: `COUCHBASE_HOST=couchbase.local COUCHBASE_BUCKET=test npm test`.

**WARNING:** Note that CouchbaseMock does not properly implement `append` and `prepend`, so if you're running the test suite against it, you should set the `COUCHBASE_MOCK` env var to `1` when running the tests (`COUCHBASE_MOCK=1 npm t`), which will skip the verifications and issue warnings for specific things that can't be tested.



Now you're ready to run the tests (`npm test`).
Make sure they pass before submitting a pull request.

Thanks!
