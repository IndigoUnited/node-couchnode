# Couchnode

Sane Couchbase bucket interface for handling common operations the right way.

![Build status](https://travis-ci.org/IndigoUnited/node-couchnode.svg)

## Rant

Couchbase's official bucket interface contains a bunch of questionable design
options that make common operations very cumbersome to handle. Check below some
examples:

- A common operation is to try to get a key and expect it to potentially not
be there. Unfortunately, the official client handles this as a failure, and
returns an `Error` in the callback, meaning you have to constantly to check if
the error code is not `couchbase.errors.keyNotFound`. JavaScript has an
`undefined` type, which could be leverage for these scenarios.

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

## Introduction

The *rant* should give you a good understanding of the motivation behind this
module. Check below some simple usage examples.

```

```

## API



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

- Document `tuple`
- Handle multiple errors inside a get, and add a proper "main error" instead of an error count. Check if this should be applied to other operations.
- Create a better way of signaling a CAS failure. Consider either adding a new error code or attaching a `.casFailure` property to the `Error`.
