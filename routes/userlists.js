/*
 * threads routing
 *
 * PUT
 *
 */
var _ = require('underscore')
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

    // add buddy / ignore
    app.post('/buddies', checkAuth, function(req, res, next){
        var body = req.body || {},
            route = body.command === 'ignore' ? 'ignore' : 'buddy';

        api.modifyUserList(res, {
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

};