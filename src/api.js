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
    crypto = require('crypto'),
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
            if(cb){
                cb(null, data);
            }
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

        makeRequest('get', apiUrl + route, {qs: query}, cb);
    },

    getThread: function(res, params, user, cb){
        user = user || {};

        var uri = apiUrl + '/thread/' + encodeURIComponent(params.threadUrlName) + '/complete',
            query = _(params).defaults({
                size: user.comment_size || defaultprefs.numcomments
            });
        
        delete query.threadUrlName;

        makeRequest('get', uri, {qs: query}, cb);
    },

    getRandomThread: function(res, params, user, cb){
        makeRequest('get', apiUrl + '/randomthread', null, cb);
    },

    getUsers: function(res, params, user, cb){
        var query = _.defaults(params || {}, {
                size: 40
            });

        if(params.buddies){
            route = '/user/' + params.buddies + '/buddies/summary';
        }
        if(params.ignores){
            route = '/user/' + params.ignores + '/ignores/summary';
        }
        if(!params.buddies && !params.ignores){
            route = '/users/summary';
        }

        makeRequest('get', apiUrl + route, {qs: query}, cb);
    },

    getUser: function(res, params, user, cb){
        var route = '/user/' + params.username;

        makeRequest('get', apiUrl + route, null, cb);
    },

    getComment: function(res, params, user, cb){
        makeRequest('get', apiUrl + '/comment/' + params.commentId + '/summary', null, cb);
    },

    getUserComments: function(res, params, user, cb){
        makeRequest('get', apiUrl + '/user/' + params.username + '/comments', null, cb);
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

        makeRequest('post', apiUrl + '/thread', {
            form: {
                categories: body.categories,
                name: XSSWrapper(body.name).clean().value(),
                content: XSSWrapper(body.content).convertNewlines().convertPinkies().convertMe(user).convertYou().clean().value(),
                postedby: user.username
            }
        }, cb);
    },

    closeThread: function(res, body, user, cb){
        user = user || {};

        try {
            check(body.threadUrlName, 'Threadurlname failed validation').notEmpty();
        }catch(err){
            return cb(err);
        }

        makeRequest('put', apiUrl + '/thread/' + body.threadUrlName, {
            form: {
                closed: true
            }
        }, cb);
    },

    openThread: function(res, body, user, cb){
        user = user || {};

        try {
            check(body.threadUrlName, 'Threadurlname failed validation').notEmpty();
        }catch(err){
            return cb(err);
        }

        makeRequest('put', apiUrl + '/thread/' + body.threadUrlName, {
            form: {
                closed: false
            }
        }, cb);
    },

    markThreadNSFW: function(res, body, user, cb){
        user = user || {};

        try {
            check(body.threadUrlName, 'Threadurlname failed validation').notEmpty();
        }catch(err){
            return cb(err);
        }

        makeRequest('put', apiUrl + '/thread/' + body.threadUrlName, {
            form: {
                nsfw: true
            }
        }, cb);
    },

    markThreadSFW: function(res, body, user, cb){
        user = user || {};

        try {
            check(body.threadUrlName, 'Threadurlname failed validation').notEmpty();
        }catch(err){
            return cb(err);
        }

        makeRequest('put', apiUrl + '/thread/' + body.threadUrlName, {
            form: {
                nsfw: false
            }
        }, cb);
    },

    postComment: function(res, body, user, cb){
        user = user || {};

        try {
            check(body.content, 'Content failed validation').notEmpty();
            check(body.threadid, 'Threadid failed validation').isHexadecimal().len(24, 24);
        }catch(err){
            return cb(err);
        }
        
        makeRequest('post', apiUrl + '/comment', {
            form: {
                postedby: user.username,
                content: XSSWrapper(body.content).convertNewlines().convertPinkies().convertMe(user).convertYou().clean().value(),
                threadid: body.threadid
            }
        }, cb);
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

            makeRequest('put', apiUrl + '/comment/' + body.comment_id, {
                form: {
                    content: XSSWrapper(body.content).convertNewlines().convertPinkies().convertMe(user).convertYou().clean().value()
                }
            }, cb);
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

        makeRequest('post', apiUrl + '/user', {
            form: {
                username: body.username,
                password: body.password,
                email: body.email
            }
        }, cb);
    },

    handleLogin: function(res, body, user, cb){
        user = user || {};

        try {
            check(body.username, 'Username failed validation').len(1,32);
            check(body.password, 'Password failed validation').len(4,30);
        }catch(err){
            return cb(err);
        }
        
        makeRequest('post', apiUrl + '/login', {
            form: {
                username: body.username,
                password: body.password
            }
        }, cb);
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

        makeRequest('put', apiUrl + '/user/' + user.username + '/' + body.route, {
            form: {
                listval: body.listval
            }
        }, cb);
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
        try {
            check(user.username, 'User not found').notNull();
        }catch(e){
            return cb(e);
        }

        makeRequest('get', apiUrl + '/user/' + user.username + '/inbox', null, cb);
    },

    getOutbox: function(res, body, user, cb){
        user = user || {};
        try {
            check(user.username, 'User not found').notNull();
        }catch(e){
            return cb(e);
        }

        makeRequest('get', apiUrl + '/user/' + user.username + '/outbox', null, cb);
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

        makeRequest('post', apiUrl + '/user/' + user.username + '/sendmessage', {
            form: {
                recipients: recipients,
                subject: XSSWrapper(body.subject).clean().value(),
                content: XSSWrapper(body.content).convertNewlines().convertPinkies().convertMe(user).convertYou().clean().value()
            }
        }, cb);
    },

    getMessage: function(req, body, user, cb){
        user = user || {};

        try {
            check(body.messageid, 'Threadid failed validation').isHexadecimal().len(24, 24);
            check(user.username, 'User not found').notNull();
        }catch(e){
            return cb(e);
        }

        makeRequest('get', apiUrl + '/user/' + user.username + '/message/' + body.messageid, null, function(err, data){
            if(user.username === data.recipient){
                makeRequest('put', apiUrl + '/user/' + user.username + '/message/' + body.messageid + '/read');
            }
            cb(null, data);
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

        makeRequest('put', apiUrl + '/user/' + user.username + '/messages/' + body.batchType, {
            form: {
                ids: body.ids
            }
        }, cb);
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

        makeRequest('put', apiUrl + '/points', {
            form: {
                commentId: body.commentId,
                username: user.username,
                numpoints: body.pointvalue
            }
        }, cb);
    },

    ping: function(res, body, user, cb){
        user = user || {};
        if(!user.username) return cb();

        makeRequest('get', apiUrl + '/user/' + user.username + '/ping', null, cb);
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

        makeRequest('put', apiUrl + '/user/' + user.username + '/changepassword', {
            form: {
                password: body.old_password,
                new_password: body.password
            }
        }, cb);
    },

    updatePersonalDetails: function(res, body, user, cb){
        user = user || {};

        try{
            check(user.username, 'User not found').notNull();
        }catch(e){
            return cb(e);
        }

        makeRequest('put', apiUrl + '/user/' + user.username + '/personaldetails', {
            form: {
                realname: body.real_name,
                location: body.location,
                about: body.about_blurb
            }
        }, cb);
    },

    updateEmail: function(res, body, user, cb){
        user = user || {};

        try{
            check(user.username, 'User not found').notNull();
            check(body.email, "Email failed validation").isEmail();
        }catch(e){
            return cb(e);
        }

        makeRequest('put', apiUrl + '/user/' + user.username + '/changeemail', {
            form: {
                email: body.email
            }
        }, cb);
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

        makeRequest('put', apiUrl + '/user/' + user.username + '/websites', {
            form: {
                websites: _(body).reduce(function(memo, value, key){
                    if(websiteKeys.indexOf(key) > -1){
                        memo[key] = value;
                    }
                    return memo;
                }, {})
            }
        }, cb);
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

        makeRequest('put', apiUrl + '/user/' + user.username + '/preferences', {
            form: {
                custom_css: body.custom_css,
                custom_js: body.custom_js,
                random_titles: body.random_titles === '1',
                hide_enemy_posts: body.hide_enemy_posts === '1',
                thread_size: numThreads,
                comment_size: numComments,
                fixed_chat_size: body.fixed_chat_size === '1'
            }
        }, cb);
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

    createImage: function(res, body, user, cb){
        var md5sum = crypto.createHash('md5'),
            dataURL = body.dataURL || '',
            filename = md5sum.update(dataURL + Date.now()).digest('hex') + '.png',
            approot = __dirname.replace(/\/src$/, ''),
            filepath = approot + '/public/img/userimages/' + filename,
            dataMatches = dataURL.match(/^data:image\/png;base64,(.*)$/);

        try{
            check(dataMatches.length, 'dataURL invalid').is(2);
            check(dataURL, 'Image too large').len(1, 1024 * 1000 * 2);
        }catch(e){
            return cb(e);
        }

        fs.writeFile(filepath, new Buffer(dataMatches[1], 'base64'), function(err){
            if(err){
                return cb(err);
            }

            cb(null,{
                filepath: filepath.replace(approot + '/public', ''),
                width: body.width,
                height: body.height
            });
        });
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