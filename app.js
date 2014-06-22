
/**
 * Module dependencies.
 */

var cluster   = require('cluster');

cluster.setupMaster({
    exec : 'worker.js'
});

// Count the machine's CPUs
var cpuCount = require('os').cpus().length;

// Create a worker for each CPU
for(var i = 0; i < cpuCount; i += 1){
    cluster.fork();
}

// Restart dead workers
cluster.on('exit', function (worker) {
    console.log('Worker ' + worker.id + ' died :(');
    cluster.fork();
});

console.log('Master process started');