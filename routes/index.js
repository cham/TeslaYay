/*
 * Tesla API routes
 */
'use strict';

var express = require('express'),
    request = require('request').defaults({
        encoding: 'utf8',
        jar: false,
        timeout: 30 * 1000
    }),
    skin = 'yayhooray';

module.exports = function routing(){

    var app = new express.Router();

    function checkAuth(res, req, next){
        next();
    }

    

    // crapapi
    app.get('/crapapi/users', checkAuth, function(req, res, next){
        request['get']({
            uri: 'http://localhost:3000/users'
        }, function(err, response, body){
            if(err){
                next(err);
            }
            res.send(body);
        });
    });

    app.get('/crapapi/fakeuser', checkAuth, function(req, res, next){
        var body = {
                username: 'cham',
                password: 'b33d065',
                email: 'danneame@gmail.com'
            };

        request({
            method: 'post',
            uri: 'http://localhost:3000/user',
            form: body
        }, function(err, response, body){
            if(err){
                next(err);
            }
            res.send(body);
        });
    });

    app.get('/crapapi/deleteusers', checkAuth, function(req, res, next){
        request({
            method: 'delete',
            uri: 'http://localhost:3000/users'
        }, function(err, response, body){
            if(err){
                next(err);
            }
            res.send(body);
        });
    });

    app.get('/crapapi/deleteuser', checkAuth, function(req, res, next){
        request({
            method: 'delete',
            uri: 'http://localhost:3000/user/cham'
        }, function(err, response, body){
            if(err){
                next(err);
            }
            res.send(body);
        });
    });

    app.get('*', function(req, res, next){
        res.statusCode = 404;
        return next();
    });

    return app.middleware;

};