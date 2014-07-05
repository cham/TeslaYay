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

var _errorCodes = _([500, 401, 404]);
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
function makeRequest(method, url, options, cb){
    options = _.extend(options || {}, {
        method: method,
        url: url
    });

    request(options, function(err, response, json){
        if(!checkResponse(err, response, cb)) return;

        parseJson(json, cb, function(data){
            cb(null, data);
        });
    });
}

module.exports = {

    getThreads: function(res, params, user, cb){
        user = user || {};

        var query = _(params).defaults({
                size: user.thread_size || defaultprefs.numthreads
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
                size: user.comment_size || defaultprefs.numcomments
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

    getUserComments: function(res, params, user, cb){
        user = user || {};

        request({
            method: 'get',
            uri: apiUrl + '/user/' + params.username + '/comments'
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
    },

    getPreferences: function(res, body, user, cb){
        user = user || {};

        try {
            check(user.username, 'User not found').notNull();
        }catch(e){
            return cb(e);
        }

        cb(null, {});
    },

    changePassword: function(res, body, user, cb){
        user = user || {};

        try{
            check(user.username, 'User not found').notNull();
            check(body.old_password, 'Old password failed validation').len(6,30);
            check(body.password, 'New password failed validation').len(6,30);
            check(body.password2, 'Confirm password failed validation').len(6,30);
            check(body.password2, 'Confirm password does not match').equals(body.password);
        }catch(e){
            return cb(e);
        }

        request({
            method: 'put',
            url: apiUrl + '/user/' + user.username + '/changepassword',
            form: {
                password: body.old_password,
                new_password: body.password
            }
        }, function(err, response, json){
            if(!checkResponse(err, response, cb)) return;

            parseJson(json, cb, function(data){
                cb(null, data);
            });
        });
    },

    updatePersonalDetails: function(res, body, user, cb){
        user = user || {};

        try{
            check(user.username, 'User not found').notNull();
        }catch(e){
            return cb(e);
        }

        request({
            method: 'put',
            url: apiUrl + '/user/' + user.username + '/personaldetails',
            form: {
                realname: body.real_name,
                location: body.location,
                about: body.about_blurb
            }
        }, function(err, response, json){
            if(!checkResponse(err, response, cb)) return;

            parseJson(json, cb, function(data){
                cb(null, data);
            });
        });
    },

    updateEmail: function(res, body, user, cb){
        user = user || {};

        try{
            check(user.username, 'User not found').notNull();
            check(body.email, "Email failed validation").isEmail();
        }catch(e){
            return cb(e);
        }

        request({
            method: 'put',
            url: apiUrl + '/user/' + user.username + '/changeemail',
            form: {
                email: body.email
            }
        }, function(err, response, json){
            if(!checkResponse(err, response, cb)) return;

            parseJson(json, cb, function(data){
                cb(null, data);
            });
        });
    },

    updateWebsites: function(res, body, user, cb){
        var websiteKeys = [
            'website_1',
            'website_2',
            'website_3',
            'flickr_username',
            'facebook',
            'aim',
            'gchat',
            'lastfm',
            'msn',
            'twitter'
        ];

        user = user || {};

        try{
            check(user.username, 'User not found').notNull();
        }catch(e){
            return cb(e);
        }

        request({
            method: 'put',
            url: apiUrl + '/user/' + user.username + '/websites',
            form: {
                websites: _(body).reduce(function(memo, value, key){
                    if(websiteKeys.indexOf(key) > -1){
                        memo[key] = value;
                    }
                    return memo;
                }, {})
            }
        }, function(err, response, json){
            if(!checkResponse(err, response, cb)) return;

            parseJson(json, cb, function(data){
                cb(null, data);
            });
        });
    },

    updateForumPreferences: function(res, body, user, cb){
        var numThreads = parseInt(body.threads_shown, 10),
            numComments = parseInt(body.comments_shown, 10);

        user = user || {};

        try{
            check(user.username, 'User not found').notNull();
            if(body.custom_css){
                check(body.custom_css, 'Custom CSS failed validation').isUrl();
            }
            if(body.custom_js){
                check(body.custom_js, 'Custom JavaScript failed validation').isUrl();
            }
        }catch(e){
            return cb(e);
        }

        if(isNaN(numThreads) || numThreads === 0){
            numThreads = 50;
        }
        if(isNaN(numComments) || numComments === 0){
            numComments = 100;
        }

        request({
            method: 'put',
            url: apiUrl + '/user/' + user.username + '/preferences',
            form: {
                custom_css: body.custom_css,
                custom_js: body.custom_js,
                random_titles: body.random_titles === '1',
                hide_enemy_posts: body.hide_enemy_posts === '1',
                thread_size: numThreads,
                comment_size: numComments,
                fixed_chat_size: body.fixed_chat_size === '1'
            }
        }, function(err, response, json){
            if(!checkResponse(err, response, cb)) return;

            parseJson(json, cb, function(data){
                cb(null, data);
            });
        });
    },

    toggleHTML: function(res, body, user, cb){
        user = user || {};

        try{
            check(user.username, 'User not found').notNull();
        }catch(e){
            return cb(e);
        }

        makeRequest('put', apiUrl + '/user/' + user.username + '/togglehtml', null, cb);
    },

    updateAvatar: function(file, user, cb){
        var filename;

        if(file.size  > 40000){
            return cb(new Error('File too large'));
        }
        if(file.type.indexOf('image') !== 0){
            return cb(new Error('Wrong file type'));
        }

        fs.readFile(file.path, function(err, data){
            filename = __dirname.replace(/\/src$/, '/public/avatars/') + user.username;

            fs.writeFile(filename, data, function(err){
                if(err){
                    return cb(err);
                }

                cb();
            });
        });
    }

};