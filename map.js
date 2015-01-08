var async = require('async');
var fs    = require('fs');

async.map(['file1','file2','file3'], fs.stat, function(err, results){

console.log(arguments);
    // results is now an array of stats for each file
});
