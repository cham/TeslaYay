/*jshint node:true*/
'use strict';

var emitter = require('redis').createClient();

module.exports = {
    listen: function(req, res, eventName, cb){
        var subscriber = require('redis').createClient();

        req.socket.setTimeout(Infinity);
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });
        res.write('\n');

        subscriber.subscribe(eventName);
        subscriber.on('message', function(channel, message){
            res.write('id: ' + Date.now() + '\n');
            res.write('data: ' + message + '\n\n');
        });

        req.on('close', function(){
            subscriber.unsubscribe();
            subscriber.quit();
        });
    },
    emit: function(eventName, body){
        emitter.publish(eventName, {});
    }
};
