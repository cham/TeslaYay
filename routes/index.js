/*
 * Tesla API routes
 */
'use strict';

var _ = require('underscore'),
    express = require('express'),
    moment = require('moment'),
    api = require('../src/api'),
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
        api.getThreads(res, function(err, threads){
            res.render('index', {
                threads: _(threads).map(function(thread){
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
        api.getThread(res, {threadUrlName: req.route.params.threadUrlName}, function(err, thread){
            res.render('thread', {
                title: thread.name,
                urlname: thread.urlname,
                author: thread.postedby,
                threadid: thread._id,
                comments: thread.comments
            });
        });
    });

    // register form
    app.get('/register', function(req, res, next){
        res.render('register', {});
    });

    // post thread
    app.post('/newthread', checkAuth, function(req, res, next){
        api.postThread(res, req.body, function(err, thread){
            res.redirect('/thread/' + thread.urlname);
        });
    });

    // post comment
    app.post('/thread/:threadUrlName', checkAuth, function(req, res, next){
        api.postComment(res, req.body, function(err, comment){
            res.redirect('/thread/'+ encodeURIComponent(req.route.params.threadUrlName));
        });
    });

    // register
    app.post('/register', function(req, res, next){
        api.registerUser(res, req.body, function(err, user){
            res.redirect('/');
        });
    });

    // proxy shit
    app.get('/js/*', function(req, res, next){
        return res.end();
    });

    app.get('*', function(req, res, next){
        if(!splatProxy){
            res.status(404);
            return res.end();
        }
        var x = request('http://www.yayhooray.net' + req.route.params[0]);
        req.pipe(x);
        x.pipe(res);
    });

    return app.middleware;

};