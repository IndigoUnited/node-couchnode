'use strict';

module.exports = function (err) {
    if (err) {
        if (err.errors) {
            for (var k in err.errors) {
                console.error(k + ':', err.errors[k]);
            }
        }
        throw err;
    }
};
