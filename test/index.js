'use strict';

// test suites
var appendSuit      = require('./lib/suites/append'),
    counterSuit     = require('./lib/suites/counter'),
    getSuit         = require('./lib/suites/get'),
    getAndLockSuit  = require('./lib/suites/getAndLock'),
    getAndTouchSuit = require('./lib/suites/getAndTouch'),
    getReplicaSuit  = require('./lib/suites/getReplica'),
    insertSuit      = require('./lib/suites/insert'),
    prependSuit     = require('./lib/suites/prepend'),
    querySuit       = require('./lib/suites/query'),
    removeSuit      = require('./lib/suites/remove'),
    replaceSuit     = require('./lib/suites/replace'),
    touchSuit       = require('./lib/suites/touch'),
    unlockSuit      = require('./lib/suites/unlock'),
    upsertSuit      = require('./lib/suites/upsert')
;

var fixtures = require('./lib/fixtures');

beforeEach(fixtures.apply);

describe('append',       appendSuit);
describe('counter',      counterSuit);
describe('get',          getSuit);
describe('getAndLock',   getAndLockSuit);
describe('getAndTouch',  getAndTouchSuit);
describe('getReplica',   getReplicaSuit);
describe('insert',       insertSuit);
describe('prepend',      prependSuit);
describe('query',        querySuit);
describe('remove',       removeSuit);
describe('replace',      replaceSuit);
describe('touch',        touchSuit);
describe('unlock',       unlockSuit);
describe('upsert',       upsertSuit);
