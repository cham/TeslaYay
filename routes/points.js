/*
 * points routing
 *
 * PUT
 *      /message/send
 *
 */
var _ = require('underscore');

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

module.exports = function routing(app, api, renderGenerator){
    
    /*
     * PUT
     */
    app.put('/comment/:commentId/addpoint', checkAuth, function(req, res, next){
        var commentId = req.route.params.commentId,
            threadId = req.route.params.threadId;

        api.modifyPoints(res, {
            commentId: commentId,
            threadId: threadId,
            pointvalue: 1
        }, req.session.user, function(err, json){
            if(err) return next(err);

            if(req.body.redirect) return res.redirect(req.headers.referer);

            res.send(json);
        });
    });

    app.put('/comment/:commentId/removepoint', checkAuth, function(req, res, next){
        var commentId = req.route.params.commentId,
            threadId = req.route.params.threadId;

        api.modifyPoints(res, {
            commentId: commentId,
            threadId: threadId,
            pointvalue: -1
        }, req.session.user, function(err, json){
            if(err) return next(err);

            if(req.body.redirect) return res.redirect(req.headers.referer);

            res.send(json);
        });
    });

    app.put('/pendingusers/:pendingUserId/addpoint', checkAuth, function(req, res, next){
        var pendingUserId = req.route.params.pendingUserId;

        api.voteForPendingUser(res, {
            pendingUserId: pendingUserId
        }, req.session.user, function(err, json){
            if(err) return next(err);

            if(req.body.redirect) return res.redirect(req.headers.referer);

            res.send(json);
        });
    });

};