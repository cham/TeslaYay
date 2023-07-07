
/**
 * Module dependencies.
 */

var cluster   = require('cluster'),
    redisClient = require('redis').createClient(
        6379,
        process.env.REDIS_HOST || 'localhost'
    );

var workersPerCPU = 4;

console.log('Master process starting');

redisClient.set("verify-redis-connectivity - app.js", "seems to be working", function(err, response){
    // Count the machine's CPUs
    var cpuCount = require('os').cpus().length;

    cluster.setupMaster({
        exec : 'worker.js'
    });

    // Create a worker for each CPU
    for(var i = 0; i < cpuCount; i += 1){
        for(var j = 0; j < workersPerCPU; j += 1){
            cluster.fork();
        }
    }

    // Restart dead workers
    cluster.on('exit', function (worker) {
        console.log('Worker ' + worker.id + ' died :(');
        cluster.fork();
    });

    console.log('Master process started');

});
