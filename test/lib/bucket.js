'use strict';
// real couchbase:
var couchbase = require('couchbase');
var cluster   = new couchbase.Cluster(process.env.COUCHBASE_HOST || '127.0.0.1:8091');
var bucket    = cluster.openBucket(process.env.COUCHBASE_BUCKET || 'default');

// default username and password for couchbase administration are: Administrator:password
//
// clearing bucket: couchbase-cli bucket-flush -u Administrator -p password -c 127.0.0.1:8091 -b default --force

module.exports = bucket;

/*
  Couchbase error codes:

  success                : 0,
  authContinue           : 1,
  authError              : 2,
  deltaBadVal            : 3,
  objectTooBig           : 4,
  serverBusy             : 5,
  cLibInternal           : 6,
  cLibInvalidArgument    : 7,
  cLibOutOfMemory        : 8,
  invalidRange           : 9,
  cLibGenericError       : 10,
  temporaryError         : 11,
  keyAlreadyExists       : 12,
  keyNotFound            : 13,
  failedToOpenLibrary    : 14,
  failedToFindSymbol     : 15,
  networkError           : 16,
  wrongServer            : 17,
  notMyVBucket           : 17,
  notStored              : 13,
  notSupported           : 19,
  unknownCommand         : 20,
  unknownHost            : 21,
  protocolError          : 22,
  timedOut               : 23,
  connectError           : 24,
  bucketNotFound         : 25,
  clientOutOfMemory      : 26,
  clientTemporaryError   : 27,
  badHandle              : 28,
  serverBug              : 29,
  invalidHostFormat      : 31,
  notEnoughNodes         : 33,
  duplicateItems         : 34,
  noMatchingServerForKey : 35,
  badEnvironmentVariable : 36,
  outOfMemory            : undefined,
  invalidArguments       : undefined,
  schedulingError        : undefined,
  checkResults           : undefined,
  genericError           : undefined,
  durabilityFailed       : undefined,
  restError              : undefined
 */
