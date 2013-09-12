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
    skin = 'yayhooray',
    splatProxy = true;

function generateHomepageRenderer(req, res){
    return function(err, json){
        var pages;

        if(err){
            res.status(500);
            return req.send(err);
        }

        pages = _(_.range(json.limit > 0 ? Math.ceil(json.totaldocs / json.limit) : 0))
                .reduce(function(memo, num){
                    memo.push({
                        num: num+1,
                        active: false
                    });
                    return memo;
                },[]);

        res.render('index', {
            threads: _(json.threads).map(function(thread){
                thread.createdago = moment(thread.created).fromNow();
                thread.lastpostedago = moment(thread.last_comment_time).fromNow();
                thread.numcomments = thread.comments.length;
                return thread;
            }),
            numthreads: json.threads.length,
            totaldocs: json.totaldocs,
            pages: pages,
            numpages: pages.length,
            user: req.session.user
        });
    };
}

module.exports = function routing(){

    var app = new express.Router();

    function checkAuth(req, res, next){
        if(!req.session || !req.session.user){
            return res.redirect('/');
        }
        next();
    }
    function checkUnauth(req, res, next){
        if(req.session && req.session.user){
            return res.redirect('/');
        }
        next();
    }

    // thread listing
    app.get('/', function(req, res, next){
        api.getThreads(res, req.route.params || {}, req.session.user, generateHomepageRenderer(req, res));
    });

    app.get('/threads/:page', function(req, res, next){
        api.getThreads(res, req.route.params || {}, req.session.user, generateHomepageRenderer(req, res));
    });

    // new thread
    app.get('/newthread', checkAuth, function(req, res, next){
        res.render('post', {
            user: req.session.user
        });
    });

    // view thread
    app.get('/thread/:threadUrlName', function(req, res, next){
        api.getThread(res, {threadUrlName: req.route.params.threadUrlName}, req.session.user, function(err, thread){
            res.render('thread', {
                title: thread.name,
                threadurlname: thread.urlname,
                author: thread.postedby,
                threadid: thread._id,
                comments: _(thread.comments).map(function(comment){
                    comment.createdago = moment(comment.created).fromNow();
                    return comment;
                }),
                user: req.session.user
            });
        });
    });

    // register form
    app.get('/register', checkUnauth, function(req, res, next){
        res.render('register', {
            user: req.session.user
        });
    });

    // POSTs
    // post thread
    app.post('/newthread', checkAuth, function(req, res, next){
        api.postThread(res, req.body, req.session.user, function(err, thread){
            if(err){
                return next(err);
            }
            res.redirect('/thread/' + thread.urlname);
        });
    });

    // post comment
    app.post('/thread/:threadUrlName', checkAuth, function(req, res, next){
        var threadUrlName = req.route.params.threadUrlName;

        api.postComment(res, req.body, req.session.user, function(err, comment){
            res.redirect('/thread/'+ encodeURIComponent(threadUrlName));
        });
    });

    // register
    app.post('/register', function(req, res, next){
        api.registerUser(res, req.body, req.session.user, function(err, user){
            res.redirect('/');
        });
    });

    // login
    app.post('/login', function(req, res, next){
        api.handleLogin(res, req.body, req.session.user, function(err, user){
            if(user.username){
                req.session.user = user;
            }else{
                delete req.session.user;
            }
            res.redirect(req.headers['referer']);
        });
    });

    // logout
    app.post('/logout', function(req, res, next){
        delete req.session.user;
        res.redirect('/');
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
        x.pipe(fs.createWriteStream('../public' + req.route.params[0])).pipe(res);
    });

    return app.middleware;

};