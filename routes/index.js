/*
 * Tesla API routes
 */
'use strict';

var _ = require('underscore'),
    express = require('express'),
    async = require('async'),
    moment = require('moment'),
    fs = require('fs'),
    api = require('../src/api'),
    renderGenerator = require('../src/renderGenerator'),
    request = require('request').defaults({
        encoding: 'utf8',
        jar: false,
        timeout: 30 * 1000
    }),
    userprefs = {
        numthreads: 50,
        numcomments: 100
    },
    stresstest = false,
    stressTester = stresstest ? require('../src/stressTester') : {routing:function(){}};

module.exports = function routing(){

    var app = new express.Router();

    function setUser(req, user){
        req.session.user = user;
        req.session.user.preferences = userprefs;
    }
    function checkAuth(req, res, next){
        if(!req.session || !req.session.user){
            if(req.route.method === 'get'){
                return res.redirect('/');
            }
            res.status(401);
            return res.end();
        }
        next();
    }
    function checkUnauth(req, res, next){
        if(req.session && req.session.user){
            return res.redirect('/');
        }
        next();
    }
    if(stresstest){
        stressTester.routing(app);
    }

    // thread listing
    app.get('/', function(req, res, next){
        api.getTitle(function(err, titlejson){
            if(err) return next(err);

            api.getThreads(res, req.query || {}, req.session.user, renderGenerator.threadsListingHandler(req, res, {titledata: titlejson}, next));
        });
    });
    app.get('/page', function(req, res, next){
        res.redirect('/');
    });
    app.get('/page/:page', function(req, res, next){
        if(req.route.params.page === '1'){
            return res.redirect('/');
        }
        api.getTitle(function(err, titlejson){
            if(err) return next(err);

            api.getThreads(res, _(req.query || {}).extend(req.route.params || {}), req.session.user, renderGenerator.threadsListingHandler(req, res, {titledata: titlejson}, next));
        });
    });
    // category search
    app.get('/category/:categories', function(req, res, next){
        api.getTitle(function(err, titlejson){
            if(err) return next(err);

            api.getThreads(res, _(req.query || {}).extend({
                categories: req.route.params.categories
            }), req.session.user, renderGenerator.threadsListingHandler(req, res, {titledata: titlejson}, next));
        });
    });
    app.get('/category/:categories/page', function(req, res, next){
        res.redirect('/category/' + req.route.param.categories);
    });
    app.get('/category/:categories/page/:page', function(req, res, next){
        api.getTitle(function(err, titlejson){
            if(err) return next(err);

            api.getThreads(res, _(req.query || {}).extend(req.route.params || {}, {
                categories: req.route.params.categories
            }), req.session.user, renderGenerator.threadsListingHandler(req, res, {titledata: titlejson}, next));
        });
    });
    // participated
    app.get('/participated', checkAuth, function(req, res, next){
        api.getTitle(function(err, titlejson){
            if(err) return next(err);

            api.getThreads(res, _(req.query || {}).extend({
                participated: req.session.user.username
            }), req.session.user, renderGenerator.threadsListingHandler(req, res, {titledata: titlejson}, next));
        });
    });
    app.get('/participated/page/:page', checkAuth, function(req, res, next){
        api.getTitle(function(err, titlejson){
            if(err) return next(err);

            api.getThreads(res, _(req.query || {}).extend(req.route.params, {
                participated: req.session.user.username
            }), req.session.user, renderGenerator.threadsListingHandler(req, res, {titledata: titlejson}, next));
        });
    });
    //favourites
    app.get('/favourites', checkAuth, function(req, res, next){
        api.getTitle(function(err, titlejson){
            if(err) return next(err);

            api.getThreads(res, _(req.query || {}).extend({
                favourites: req.session.user.username
            }), req.session.user, renderGenerator.threadsListingHandler(req, res, {titledata: titlejson}, next));
        });
    });
    app.get('/favourites/page/:page', checkAuth, function(req, res, next){
        api.getTitle(function(err, titlejson){
            if(err) return next(err);

            api.getThreads(res, _(req.query || {}).extend(req.route.params, {
                favourites: req.session.user.username
            }), req.session.user, renderGenerator.threadsListingHandler(req, res, {titledata: titlejson}, next));
        });
    });
    // hidden
    app.get('/hidden', checkAuth, function(req, res, next){
        api.getTitle(function(err, titlejson){
            if(err) return next(err);

            api.getThreads(res, _(req.query || {}).extend({
                hidden: req.session.user.username
            }), req.session.user, renderGenerator.threadsListingHandler(req, res, {titledata: titlejson}, next));
        });
    });
    // started
    app.get('/started', checkAuth, function(req, res, next){
        api.getTitle(function(err, titlejson){
            if(err) return next(err);

            api.getThreads(res, _(req.query || {}).extend({
                postedby: req.session.user.username
            }), req.session.user, renderGenerator.threadsListingHandler(req, res, {titledata: titlejson}, next));
        });
    });
    app.get('/started/page/:page', checkAuth, function(req, res, next){
        api.getTitle(function(err, titlejson){
            if(err) return next(err);

            api.getThreads(res, _(req.query || {}).extend(req.route.params, {
                postedby: req.session.user.username
            }), req.session.user, renderGenerator.threadsListingHandler(req, res, {titledata: titlejson}, next));
        });
    });
    // buddy / ignore listing
    app.get('/buddies(/:username)?', checkAuth, function(req, res, next){
        async.parallel([
            function(done){
                api.getUsers(res, { buddies: req.session.user.username }, req.session.user, function(err, json){
                    done(err, {buddies: json.users});
                });
            },
            function(done){
                api.getUsers(res, { ignores: req.session.user.username }, req.session.user, function(err, json){
                    done(err, {ignores: json.users});
                });
            },
        ], function(err, results){
            renderGenerator.userListingHandler(req, res, next)(null, _(results).chain().reduce(function(memo, item){
                return _(memo).extend(item);
            },{}).extend({
                prefill: (req.route.params.username || '').replace(/^\//,'')
            }).value());
        });
    });

    // view thread
    app.get('/thread/:threadUrlName', function(req, res, next){
        api.getThread(res, req.route.params || {}, req.session.user, renderGenerator.threadDetailHandler(req, res, next));
    });
    app.get('/thread/:threadUrlName/page/:page', function(req, res, next){
        if(req.route.params.page === '1'){
            return res.redirect('/thread/' + req.route.params.threadUrlName);
        }
        api.getThread(res, req.route.params || {}, req.session.user, renderGenerator.threadDetailHandler(req, res, next));
    });

    // post thread form
    app.get('/newthread', checkAuth, function(req, res, next){
        res.render('post', {
            user: req.session.user
        });
    });

    // register form
    app.get('/register', checkUnauth, function(req, res, next){
        res.render('register', {
            user: req.session.user
        });
    });

    // user page
    app.get('/user/:username', function(req, res, next){
        api.getUser(res, req.route.params || {}, req.session.user, renderGenerator.userDetailHandler(req, res, next));
    });

    // POSTs
    // post thread
    app.post('/newthread', checkAuth, function(req, res, next){
        api.postThread(res, req.body, req.session.user, function(err, thread){
            if(err){
                return next(err);
            }
            if(req.body.redirect){
                res.redirect('/thread/' + thread.urlname);
            }else{
                res.send(thread);
            }
        });
    });

    // post comment
    app.post('/thread/:threadUrlName', checkAuth, function(req, res, next){
        api.postComment(res, req.body, req.session.user, function(err, comment){
            if(req.body.redirect){
                res.redirect(req.headers['referer']+'#bottom');
            }else{
                res.send(comment);
            }
        });
    });

    // register
    app.post('/register', function(req, res, next){
        api.registerUser(res, req.body, req.session.user, function(err, user){
            setUser(req, user);
            res.redirect('/');
        });
    });

    // login
    app.post('/login', function(req, res, next){
        api.handleLogin(res, req.body, req.session.user, function(err, user){
            if(user.username){
                setUser(req, user);
            }else{
                delete req.session.user;
            }
            res.redirect(req.headers['referer']);
        });
    });

    // edit title
    app.post('/title/edit', function(req, res, next){
        api.changeTitle(res, req.body, req.session.user, function(err){
            if(err){
                res.status(400);
                return res.send(err);
            }

            res.redirect(req.headers['referer']);
        });
    });


    /*
     * puts
     */
    // add favourite
    app.put('/thread/:threadUrlName/favourite', checkAuth, function(req, res, next){
        api.addToUserList(res, {
            listval: req.body.threadid,
            route: 'favourite'
        }, req.session.user, function(err, user){
            if(err) return next(err);

            if(user._id){
                setUser(req, user);
            }

            res.send(user);
        });
    });
    // hide thread
    app.put('/thread/:threadUrlName/hide', checkAuth, function(req, res, next){
        api.addToUserList(res, {
            listval: req.body.threadid,
            route: 'hide'
        }, req.session.user, function(err, user){
            if(err) return next(err);

            if(user._id){
                setUser(req, user);
            }

            res.send(user);
        });
    });
    // add buddy / ignore
    app.post('/buddies', checkAuth, function(req, res, next){
        var body = req.body || {},
            route = body.command === 'ignore' ? 'ignore' : 'buddy';

        api.addToUserList(res, {
            listval: body.username,
            route: route
        }, req.session.user, function(err, user){
            if(err) return next(err);

            if(user._id){
                setUser(req, user);
            }

            if(req.body.redirect){
                res.redirect(req.headers['referer']);
            }else{
                res.send(user);
            }
        });
    });

    // logout
    app.post('/logout', function(req, res, next){
        delete req.session.user;
        res.redirect('/');
    });

    return app.middleware;

};