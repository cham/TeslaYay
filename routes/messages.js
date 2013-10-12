/*
 * messages routing
 *
 * GET
 *      /message/send
 *      /messages
 *      /messages/inbox
 * 
 * POST
 *      /message/send
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

module.exports = function routing(app, api, renderGenerator){

    /*
     * GET
     */
    app.get('/messages', checkAuth, function(req, res, next){
        res.redirect('/messages/inbox', 301);
    });
    
    app.get('/messages/inbox', checkAuth, function(req, res, next){
        api.getInbox(req, req.route.query || {}, req.session.user, renderGenerator.inboxHandler(req, res, next));
    });
    
    app.get('/messages/outbox', checkAuth, function(req, res, next){
        api.getOutbox(req, req.route.query || {}, req.session.user, renderGenerator.inboxHandler(req, res, next));
    });

    app.get('/message/send', checkAuth, function(req, res, next){
        res.render('sendmessage', {
            user: req.session.user
        });
    });

    /*
     * POST
     */
    app.post('/message/send', checkAuth, function(req, res, next){
console.log('post message');
        api.postMessage(res, req.body, req.session.user, function(err, json){
            if(err) return next(err);

            if(req.body.redirect){
                return res.redirect('/messages/inbox');
            }

            res.send(json);
        });
    });
    

};