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
    
    function ping(req, res, next){
        if(!req.session.user) return next();
        api.ping(res, {
            ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
        }, req.session.user, function(err, user){
            if(err) return next(err);
            req.session.user = user;
            next();
        });
    }

    /*
     * GET
     */
    app.get('/messages', checkAuth, ping, function(req, res, next){
        res.redirect('/messages/inbox', 301);
    });
    
    app.get('/messages/inbox', checkAuth, ping, function(req, res, next){
        api.getInbox(req, req.route.query || {}, req.session.user, renderGenerator.inboxHandler(req, res, next));
    });
    
    app.get('/messages/outbox', checkAuth, ping, function(req, res, next){
        api.getOutbox(req, req.route.query || {}, req.session.user, renderGenerator.outboxHandler(req, res, next));
    });

    app.get('/message/send(/:username)?', checkAuth, ping, function(req, res, next){
        var username = (req.route.params.username || '').replace('/', '');
        
        renderGenerator.messageSendHandler(req, res, next)(null, {
            sender: username
        });
    });

    app.get('/message/:messageid', checkAuth, ping, function(req, res, next){
        api.getMessage(req, req.route.params || {}, req.session.user, renderGenerator.messageHandler(req, res, next));
    });

    app.get('/message/:messageid/reply', checkAuth, ping, function(req, res, next){
        api.getMessage(req, req.route.params || {}, req.session.user, renderGenerator.messageSendHandler(req, res, next));
    });

    /*
     * POST
     */
    app.post('/message/send', checkAuth, ping, function(req, res, next){
        api.postMessage(res, req.body, req.session.user, function(err, json){
            if(err) return next(err);

            if(req.body.redirect){
                return res.redirect('/messages/inbox');
            }

            res.send(json);
        });
    });

    app.post('/messages/batch/read', function(req, res, next){
        var ids = req.body.message_ids;

        api.batchUpdateMessages(res, {
            ids: ids,
            batchType: 'read'
        }, req.session.user, function(err, json){
            if(err) return next(err);

            if(req.body.redirect) return res.redirect(req.headers.referer);

            res.send(json);
        });
    });

    app.post('/messages/batch/unread', function(req, res, next){
        var ids = req.body.message_ids;

        api.batchUpdateMessages(res, {
            ids: ids,
            batchType: 'unread'
        }, req.session.user, function(err, json){
            if(err) return next(err);

            if(req.body.redirect) return res.redirect(req.headers.referer);

            res.send(json);
        });
    });

    app.post('/messages/batch/inboxdelete', function(req, res, next){
        var ids = req.body.message_ids;

        api.batchUpdateMessages(res, {
            ids: ids,
            batchType: 'recipient/delete'
        }, req.session.user, function(err, json){
            if(err) return next(err);

            if(req.body.redirect) return res.redirect(req.headers.referer);

            res.send(json);
        });
    });

    app.post('/messages/batch/outboxdelete', function(req, res, next){
        var ids = req.body.message_ids;

        api.batchUpdateMessages(res, {
            ids: ids,
            batchType: 'sender/delete'
        }, req.session.user, function(err, json){
            if(err) return next(err);

            if(req.body.redirect) return res.redirect(req.headers.referer);

            res.send(json);
        });
    });

};