/*
 * Tesla API routes
 */
'use strict';

var _ = require('underscore'),
    express = require('express'),
    moment = require('moment'),
    request = require('request').defaults({
        encoding: 'utf8',
        jar: false,
        timeout: 30 * 1000
    }),
    apiUrl = 'http://localhost:3000',
    skin = 'yayhooray',
    author = 'cham',
    splatProxy = true;

module.exports = function routing(){

    var app = new express.Router();

    function checkAuth(res, req, next){
        next();
    }

    // thread listing
    app.get('/', function(req, res, next){
        request({
            method: 'get',
            uri: apiUrl + '/threads'
        }, function(err, response, json){
            if(err){
                return next(err);
            }

            res.render('index', {
                threads: _(JSON.parse(json).threads).map(function(thread){
                    thread.createdago = moment(thread.created).fromNow();
                    thread.lastpostedago = moment(thread.last_comment_time).fromNow();
                    thread.numcomments = thread.comments.length;
                    return thread;
                })
            });
        });
    });

    // new thread
    app.get('/newthread', function(req, res, next){
        res.render('post', {});
    });

    // view thread
    app.get('/thread/:threadUrlName', function(req, res, next){
        var thread, comments,
            uri = apiUrl + '/thread/' + encodeURIComponent(req.route.params.threadUrlName) + '/complete';
        
        request({
            method: 'get',
            uri: uri
        }, function(err, response, json){
            if(err){
                return next(err);
            }
            thread = JSON.parse(json);
            comments = thread.comments;

            res.render('thread', {
                title: thread.name,
                urlname: thread.urlname,
                author: thread.postedby,
                threadid: thread._id,
                comments: comments
            });
        });
    });

    // register form
    app.get('/register', function(req, res, next){
        res.render('register', {});
    });

    // post thread
    app.post('/newthread', checkAuth, function(req, res, next){
        var body = _(req.body || {}).extend({
                postedby: author
            });

        request({
            method: 'post',
            uri: apiUrl + '/thread',
            form: body
        }, function(err, response, body){
            if(err){
                return next(err);
            }
            if(response.statusCode === 500){
                return res.end(body);
            }
            var json = JSON.parse(body);

            res.redirect('/thread/' + json.urlname);
        });
    });

    // post comment
    app.post('/thread/:threadUrlName', checkAuth, function(req, res, next){
        var body = req.body;
        
        request({
            method: 'post',
            uri: apiUrl + '/comment',
            form: {
                postedby: author,
                content: body.content,
                threadid: body.threadid
            }
        }, function(err, response, comment){
            if(err){
                return next(err);
            }
            if(response.statusCode === 500){
                return res.end('API Error! ' + body);
            }
            res.redirect('/thread/'+ encodeURIComponent(req.route.params.threadUrlName));
        });
    });

    // register
    app.post('/register', function(req, res, next){
        var body = req.body;

        request({
            method: 'post',
            uri: apiUrl + '/user',
            form: {
                username: body.username,
                password: body.password,
                email: body.email
            }
        }, function(err, response, body){
            if(err){
                return next(err);
            }
            if(response.statusCode === 500){
                return res.end('API Error! ' + body);
            }
            res.redirect('/');
        });
    });




    // crapapi for debugging - delete me when no longer required
    app.get('/crapapi/fakeuser', checkAuth, function(req, res, next){
        var body = {
                username: author,
                password: 'b33d065',
                email: 'danneame@gmail.com'
            };

        request({
            method: 'post',
            uri: apiUrl + '/user',
            form: body
        }, function(err, response, body){
            if(err){
                return next(err);
            }
            res.send(body);
        });
    });

    app.get('/js/*', function(req, res, next){
        return res.end();
    });

    app.get('*', function(req, res, next){
        if(!splatProxy){
            return res.end();
        }
        var x = request('http://www.yayhooray.net' + req.route.params[0]);
        req.pipe(x);
        x.pipe(res);
    });

    return app.middleware;

};