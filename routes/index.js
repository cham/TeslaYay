/* jshint node:true */
/*
 * Tesla API routes
 */
'use strict';

var _ = require('underscore'),
    express = require('express'),
    async = require('async'),
    moment = require('moment'),
    listingRoutes = require('./threadlisting'),
    userListRoutes = require('./userlists'),
    messageRoutes = require('./messages'),
    pointRoutes = require('./points'),
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

module.exports = function routing(io){

    var app = new express.Router();

    function setUser(req, user){
        req.session.user = user;
        req.session.user.preferences = userprefs;
    }
    function checkAuth(req, res, next){
        if(!req.session || !req.session.user || req.session.user.banned){
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
    function ping(req, res, next){
        if(!req.session.user) return next();
        api.ping(res, {}, req.session.user, function(err, user){
            if(err) return next(err);
            req.session.user = user;
            next();
        });
    }
    if(stresstest){
        stressTester.routing(app);
    }

    listingRoutes(app, api, renderGenerator);
    messageRoutes(app, api, renderGenerator);
    userListRoutes(app, api);
    pointRoutes(app, api);

    // buddy / ignore listing
    app.get('/buddies(/:username)?', checkAuth, ping, function(req, res, next){
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
    app.get('/thread/:threadUrlName', ping, function(req, res, next){
        api.getThread(res, req.route.params || {}, req.session.user, renderGenerator.threadDetailHandler(req, res, next));
    });
    app.get('/thread/:threadUrlName/page/:page', ping, function(req, res, next){
        if(req.route.params.page === '1'){
            return res.redirect('/thread/' + req.route.params.threadUrlName, 301);
        }
        api.getThread(res, req.route.params || {}, req.session.user, renderGenerator.threadDetailHandler(req, res, next));
    });

    // post thread form
    app.get('/newthread', checkAuth, ping, function(req, res, next){
        renderGenerator.newThreadHandler(req, res, next)(null, {}); // execute render method immediately, passing no error and empty data
    });

    // register form
    app.get('/register', checkUnauth, ping, function(req, res, next){
        res.render('register', {
            user: req.session.user
        });
    });

    // user page
    app.get('/user/:username', ping, function(req, res, next){
        api.getUser(res, req.route.params || {}, req.session.user, renderGenerator.userDetailHandler(req, res, next));
    });

    // comment
    app.get('/comment/:commentId', ping, function(req, res, next){
        api.getComment(res, req.route.params || {}, req.session.user, function(err, comment){
            if(err) return next(err);

            res.send(comment);
        });
    });

    // ping
    app.get('/ping', function(req, res, next){
        if(!req.session.user){
            res.end();
        }
        api.ping(res, {}, req.session.user, function(err, user){
            if(err) return next(err);
            res.end();
        });
    });

    // POSTs
    // post thread
    app.post('/newthread', checkAuth, ping, function(req, res, next){
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
    app.post('/thread/:threadUrlName', checkAuth, ping, function(req, res, next){
        var threadid = req.body.threadid;

        api.postComment(res, req.body, req.session.user, function(err, comment){
            if(err) return next(err);

            io.sockets.emit('newpost:' + req.body.threadid);

            if(req.body.redirect){
                res.redirect(req.headers['referer']+'#bottom');
            }else{
                res.send(comment);
            }
        });
    });

    // register
    app.post('/register', ping, function(req, res, next){
        api.registerUser(res, req.body, req.session.user, function(err, user){
            setUser(req, user);
            res.redirect('/');
        });
    });

    // login
    app.post('/login', ping, function(req, res, next){
        api.handleLogin(res, req.body, req.session.user, function(err, user){
            if(user && user.username){
                setUser(req, user);
            }else{
                delete req.session.user;
            }
            res.redirect(req.headers['referer']);
        });
    });

    // edit title
    app.post('/title/edit', ping, function(req, res, next){
        api.changeTitle(res, req.body, req.session.user, function(err){
            if(err){
                res.status(400);
                return res.send(err);
            }

            res.redirect(req.headers['referer']);
        });
    });

    // logout
    app.post('/logout', ping, function(req, res, next){
        delete req.session.user;
        res.redirect('/');
    });

    // PUT
    // edit comment
    app.put('/comment/:commentid', ping, function(req, res, next){
        api.editComment(res, req.body, req.session.user, function(err, comment){
            if(err) return next(err);

            if(req.body.redirect){
                res.redirect(req.headers['referer']+'#bottom');
            }else{
                res.send(comment);
            }
        });
    });

    return app.middleware;

};