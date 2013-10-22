/*
 *
 */
var _ = require('underscore'),
    fs = require('fs'),
    async = require('async'),
    moment = require('moment'),
    check = require('validator').check,
    sanitize = require('validator').sanitize,
    XSSWrapper = require('./xsswrapper'),
    apiUrl = 'http://localhost:3000',
    request = require('request').defaults({
        encoding: 'utf8',
        jar: false,
        timeout: 30 * 1000
    }),
    defaultprefs = {
        numthreads: 50,
        numcomments: 50
    };

var _errorCodes = _([500, 401]);
function checkResponse(err, apiRes, next){
    if(err) return next(err);

    if(apiRes && _errorCodes.indexOf(apiRes.statusCode) > -1){
        next(new Error(apiRes.body));
        return false;
    }
    return true;
}
function parseJson(json, next, success){
    try{
        json = JSON.parse(json);
    }catch(e){
        console.log(e, json);
        return success({});
    }
    success(json);
}
function responseHandler(err, response, json){

}

module.exports = {

    getThreads: function(res, params, user, cb){
        user = user || {};

        var query = _(params).defaults({
                size: (user.preferences && user.preferences.numthreads) || defaultprefs.numthreads
            }),
            route = user.username ? '/user/' + user.username + '/threads/summary' : '/threads/summary';

        if(params.participated){
            route = '/user/' + params.participated + '/participated/summary';
        }
        if(params.favourites){
            route = '/user/' + params.favourites + '/favourites/summary';
        }
        if(params.hidden){
            route = '/user/' + params.hidden + '/hidden/summary';
        }

        request({
            method: 'get',
            uri: apiUrl + route,
            qs: query
        }, function(err, response, json){
            if(!checkResponse(err, response, cb)) return;

            parseJson(json, cb, function(json){
                cb(null, json);
            });
        });
    },

    getThread: function(res, params, user, cb){
        user = user || {};

        var uri = apiUrl + '/thread/' + encodeURIComponent(params.threadUrlName) + '/complete',
            query = _(params).defaults({
                size: (user.preferences && user.preferences.numcomments) || defaultprefs.numcomments
            });
        
        delete query.threadUrlName;

        request({
            method: 'get',
            uri: uri,
            qs: query
        }, function(err, response, json){
            if(!checkResponse(err, response, cb)) return;

            parseJson(json, cb, function(json){
                cb(null, json);
            });
        });
    },

    getRandomThread: function(res, params, user, cb){
        request({
            method: 'get',
            uri: apiUrl + '/randomthread'
        }, function(err, response, json){
            if(!checkResponse(err, response, cb)) return;

            parseJson(json, cb, function(json){
                cb(null, json);
            });
        });
    },

    getUsers: function(res, params, user, cb){
        user = user || {};

        if(params.buddies){
            route = '/user/' + params.buddies + '/buddies/summary';
        }
        if(params.ignores){
            route = '/user/' + params.ignores + '/ignores/summary';
        }

        request({
            method: 'get',
            uri: apiUrl + route
        }, function(err, response, json){
            if(!checkResponse(err, response, cb)) return;

            parseJson(json, cb, function(json){
                cb(null, json);
            });
        });
    },

    getUser: function(res, params, user, cb){
        user = user || {};
        var route = '/user/' + params.username;

        request({
            method: 'get',
            uri: apiUrl + route
        }, function(err, response, json){
            if(!checkResponse(err, response, cb)) return;

            parseJson(json, cb, function(json){
                cb(null, json);
            });
        });
    },

    getComment: function(res, params, user, cb){
        user = user || {};
        var commentId = params.commentId;

        request({
            method: 'get',
            uri: apiUrl + '/comment/' + commentId + '/summary'
        }, function(err, response, json){
            if(!checkResponse(err, response, cb)) return;

            parseJson(json, cb, function(json){
                cb(null, json);
            });
        });
    },

    postThread: function(res, body, user, cb){
        user = user || {};
        try {
            check(body.categories, 'Categories failed validation').notNull();
            check(body.name, 'Name failed validation').notEmpty().len(1, 96);
            check(body.content, 'Content failed validation').notEmpty();
            check(user.username, 'User not found').notEmpty();
        }catch(err){
            return cb(err);
        }

        request({
            method: 'post',
            uri: apiUrl + '/thread',
            form: {
                categories: body.categories,
                name: XSSWrapper(body.name).clean().value(),
                content: XSSWrapper(body.content).convertNewlines().convertPinkies().convertMe(user).convertYou().clean().value(),
                postedby: user.username
            }
        }, function(err, response, json){
            if(!checkResponse(err, response, cb)) return;

            parseJson(json, cb, function(thread){
                cb(null, thread);
            });
        });
    },

    postComment: function(res, body, user, cb){
        user = user || {};

        try {
            check(body.content, 'Content failed validation').notEmpty();
            check(body.threadid, 'Threadid failed validation').isHexadecimal().len(24, 24);
        }catch(err){
            return cb(err);
        }

        request({
            method: 'post',
            uri: apiUrl + '/comment',
            form: {
                postedby: user.username,
                content: XSSWrapper(body.content).convertNewlines().convertPinkies().convertMe(user).convertYou().clean().value(),
                threadid: body.threadid
            }
        }, function(err, response, json){
            if(!checkResponse(err, response, cb)) return;

            parseJson(json, cb, function(comment){
                cb(null, comment);
            });
        });
    },

    editComment: function(res, body, user, cb){
        user = user || {};

        try {
            check(body.content, 'Content failed validation').notEmpty();
            check(body.comment_id, 'Commentid failed validation').isHexadecimal().len(24, 24);
        }catch(err){
            return cb(err);
        }

        this.getComment(res, {
            commentId: body.comment_id
        }, user, function(err, comment){
            if(err) return cb(err);
            
            if(!comment){
                res.status(401);
                return cb('Comment not found');
            }
            if(user.username !== comment.postedby){
                res.status(401);
                return cb('User does not own this comment');
            }
            if(moment(comment.created).diff(new Date())<-600000){
                res.status(401);
                return cb('Cannot edit posts over 10 minutes old');
            }

            request({
                method: 'put',
                uri: apiUrl + '/comment/' + body.comment_id,
                form: {
                    content: XSSWrapper(body.content).convertNewlines().convertPinkies().convertMe(user).convertYou().clean().value()
                }
            }, function(err, response, json){
                if(!checkResponse(err, response, cb)) return;

                parseJson(json, cb, function(comment){
                    cb(null, comment);
                });
            });
        });
    },

    registerUser: function(res, body, user, cb){
        user = user || {};

        try {
            check(body.username, 'Username failed validation').len(1,32);
            check(body.password, 'Password failed validation').len(4,30);
            check(body.email, 'Email failed validation').isEmail();
        }catch(err){
            return cb(err);
        }

        request({
            method: 'post',
            uri: apiUrl + '/user',
            form: {
                username: body.username,
                password: body.password,
                email: body.email
            }
        }, function(err, response, json){
            if(!checkResponse(err, response, cb)) return;

            parseJson(json, cb, function(user){
                cb(null, user);
            });
        });
    },

    handleLogin: function(res, body, user, cb){
        user = user || {};

        try {
            check(body.username, 'Username failed validation').len(1,32);
            check(body.password, 'Password failed validation').len(4,30);
        }catch(err){
            return cb(err);
        }

        request({
            method: 'post',
            uri: apiUrl + '/login',
            form: {
                username: body.username,
                password: body.password
            }
        }, function(err, response, json){
            if(!checkResponse(err, response, cb)) return;

            parseJson(json, cb, function(data){
                cb(null, data);
            });
        });
    },

    modifyUserList: function(res, body, user, cb){
        user = user || {};

        try {
            check(body.route, 'Route failed validation').notEmpty();
            check(body.listval, 'List failed validation').notNull();
            check(user.username, 'User not found').notNull();
        }catch(err){
            return cb(err);
        }

        request({
            method: 'put',
            url: apiUrl + '/user/' + user.username + '/' + body.route,
            form: {
                listval: body.listval
            }
        }, function(err, response, json){
            if(!checkResponse(err, response, cb)) return;

            parseJson(json, cb, function(data){
                cb(null, data);
            });
        });
    },

    changeTitle: function(res, body, user, cb){
        user = user || {};

        var title = body.title || '';

        try {
            check(title, 'Title failed validation').len(1, 36);
            check(user.username, 'User not found').notNull();
        }catch(e){
            return cb(e);
        }

        title = sanitize(title).trim();

        async.parallel([
            function(done){
                fs.writeFile('public/titles/current.json', JSON.stringify({title: title, username: user.username}), function(err) {
                    if(err) return cb(err);

                    done(null);
                });
            },
            function(done){
                fs.appendFile('public/titles/history.txt', user.username + ': ' + title + '\n', function(err) {
                    if(err) return cb(err);

                    done(null);
                });
            }
        ], function(){
            cb(null);
        });
    },

    getInbox: function(res, body, user, cb){
        user = user || {};
        if(!user.username) return cb();

        request({
            method: 'get',
            url: apiUrl + '/user/' + user.username + '/inbox'
        }, function(err, response, json){
            if(!checkResponse(err, response, cb)) return;

            parseJson(json, cb, function(data){
                cb(null, data);
            });
        });
    },

    getOutbox: function(res, body, user, cb){
        user = user || {};
        if(!user.username) return cb();

        request({
            method: 'get',
            url: apiUrl + '/user/' + user.username + '/outbox'
        }, function(err, response, json){
            if(!checkResponse(err, response, cb)) return;

            parseJson(json, cb, function(data){
                cb(null, data);
            });
        });
    },

    postMessage: function(req, body, user, cb){
        user = user || {};

        try {
            check(body.subject, 'Subject failed validation').len(1, 36);
            check(body.content, 'Content failed validation').notEmpty();
            check(user.username, 'User not found').notNull();
        }catch(e){
            return cb(e);
        }

        var recipients = body.recipients.split(',');

        request({
            method: 'post',
            url: apiUrl + '/user/' + user.username + '/sendmessage',
            form: {
                recipients: recipients,
                subject: XSSWrapper(body.subject).clean().value(),
                content: XSSWrapper(body.content).convertNewlines().convertPinkies().convertMe(user).convertYou().clean().value()
            }
        }, function(err, response, json){
            if(!checkResponse(err, response, cb)) return;

            parseJson(json, cb, function(data){
                cb(null, data);
            });
        });
    },

    getMessage: function(req, body, user, cb){
        user = user || {};

        try {
            check(body.messageid, 'Threadid failed validation').isHexadecimal().len(24, 24);
            check(user.username, 'User not found').notNull();
        }catch(e){
            return cb(e);
        }

        request({
            method: 'get',
            url: apiUrl + '/user/' + user.username + '/message/' + body.messageid
        }, function(err, response, json){
            if(!checkResponse(err, response, cb)) return;

            parseJson(json, cb, function(data){
                if(user.username === data.recipient){
                    request({
                        method: 'put',
                        url: apiUrl + '/user/' + user.username + '/message/' + body.messageid + '/read'
                    });
                }

                cb(null, data);
            });
        });
    },

    batchUpdateMessages: function(req, body, user, cb){
        user = user || {};

        try {
            check(user.username, 'User not found').notNull();
            check(body.batchType, 'BatchType failed validation').isIn(['read','unread','recipient/delete','sender/delete']);
            check(body.ids, 'Ids failed validation').len(1);
            _(body.ids).each(function(id){
                check(id, 'Id failed validation').isHexadecimal().len(24, 24);
            });
        }catch(e){
            return cb(e);
        }

        request({
            method: 'put',
            url: apiUrl + '/user/' + user.username + '/messages/' + body.batchType,
            form: {
                ids: body.ids
            }
        }, function(err, response, json){
            if(!checkResponse(err, response, cb)) return;

            parseJson(json, cb, function(data){
                cb(null, data);
            });
        });
    },

    modifyPoints: function(res, body, user, cb){
        user = user || {};

        try {
            check(user.username, 'User not found').notNull();
            check(body.commentId, 'CommentId failed validation').isHexadecimal().len(24, 24);
            check(body.pointvalue, 'Pointvalue failed validation').isIn([-1,1]);
        }catch(e){
            return cb(e);
        }

        request({
            method: 'put',
            url: apiUrl + '/points',
            form: {
                commentId: body.commentId,
                username: user.username,
                numpoints: body.pointvalue
            }
        }, function(err, response, json){
            if(!checkResponse(err, response, cb)) return;

            parseJson(json, cb, function(data){
                cb(null, data);
            });
        });
    },

    ping: function(res, body, user, cb){
        user = user || {};
        if(!user.username) return cb();

        request({
            method: 'get',
            url: apiUrl + '/user/' + user.username + '/ping'
        }, function(err, response, json){
            if(!checkResponse(err, response, cb)) return;

            parseJson(json, cb, function(data){
                cb(null, data);
            });
        });
    },

    getTitle: function(cb){
        fs.readFile('public/titles/current.json', function(err, json){
            if(!checkResponse(err, null, cb)) return;

            parseJson(json, cb, function(json){
                json.title = json.title.replace(/\&quot;/g, '"').replace(/\&#39;/g, "'");
                cb(null, json);
            });
        });
    }
};