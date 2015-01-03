# Couchnode

Sane Couchbase bucket interface for handling common operations the right way.

## Rant

Couchbase's official bucket interface contains a bunch of questionable design
options that make common operations very cumbersome to handle. Check below some
examples:

- A common operation is to try to get a key and expect it to potentially not
be there. Unfortunately, the official client handles this as a failure, and
returns an `Error` in the callback, meaning you have to constantly to check if
the error code is not `couchbase.errors.keyNotFound`. JavaScript has an `undefined` type, which could be leverage for these scenarios.

- In a `getMulti` scenario, the `keyNotFound` issue is even more troublesome,
in which instead of an `Error`, they return a `Number` stating the amount
of errors that occurred, and you have to iterate through the results looking for
the `.error` property in each result and comparing it to
`couchbase.errors.keyNotFound`.

- When `remove`ing a key, the operation will callback with an `Error` if the key doesn't exist. Just like the `get` problem, this becomes cumbersome, as you keep checking for `keyNotFound` codes. You often want removes to be idempotent, and the result of the operation could have been easily returned as the second parameter.

- Most operations are not *multi friendly*. By this, I mean you have to constantly do async control flow of multiple operations, which becomes very repetitive, and prone to error. Operations could have a stronger *multi operation* support, like multi insert, multi replace, etc.

## Introduction

The *rant* should give you a good understanding of the motivation behind this module. Check below some simple usage examples.

```

```

## API