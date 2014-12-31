/*
 * threads routing
 *
 * PUT
 *
 */
var _ = require('underscore'),
    userprefs = {
        numthreads: 50,
        numcomments: 100
    };

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
function setUser(req, user){
    req.session.user = user;
    req.session.user.preferences = userprefs;
}

function getBuddyMessageContent(user){
    var intro = 'Wow, what a momentous occasion! Now go return the favour...<br><br>';
    var profile = 'Profile: <a href="/user/' + user.urlname + '">/user/' + user.username + '</a><br>';
    var buddyBackLink = 'Add as buddy: <a href="/buddies/' + user.urlname + '">/buddies/' + user.username + '</a>';

    return intro + profile + buddyBackLink;
}

module.exports = function routing(app, api){

    // favourites
    app.put('/thread/:threadUrlName/favourite', checkAuth, function(req, res, next){
        api.modifyUserList(res, {
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
    app.put('/thread/:threadUrlName/unfavourite', checkAuth, function(req, res, next){
        api.modifyUserList(res, {
            listval: req.body.threadid,
            route: 'unfavourite'
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
        api.modifyUserList(res, {
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
    app.put('/thread/:threadUrlName/unhide', checkAuth, function(req, res, next){
        api.modifyUserList(res, {
            listval: req.body.threadid,
            route: 'unhide'
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
            route = body.remove ? 'un' : '';

        route += body.command === 'ignore' ? 'ignore' : 'buddy';

        api.modifyUserList(res, {
            listval: body.username,
            route: route
        }, req.session.user, function(err, user){
            if(err) return next(err);

            var redirectOnSuccess = req.body.redirect;
            var redirectTo = req.headers['referer'];

            if(user._id){
                setUser(req, user);
            }

            if(body.command === 'buddy'){
                api.postMessage(res, {
                    subject: user.username + ' just added you as a buddy',
                    content: getBuddyMessageContent(user),
                    recipients: body.username
                }, req.session.user, function(err){
                    if(err) return next(err);

                    if(redirectOnSuccess){
                        return res.redirect(redirectTo);
                    }

                    res.send(user);
                });
            }else{
                if(redirectOnSuccess){
                    res.redirect(redirectTo);
                }else{
                    res.send(user);
                }
            }
        });
    });

};