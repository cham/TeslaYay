/*
 *
 */
var _ = require('underscore'),
    request = require('request').defaults({
        encoding: 'utf8',
        jar: false,
        timeout: 30 * 1000
    }),
    moment = require('moment'),
    apiUrl = 'http://localhost:3000';

function checkResponse(err, apiRes, next){
    if(err){
        next(err);
        return false;
    }
    if(apiRes.statusCode === 500){
        next(new Error(apiRes.body));
        return false;
    }
    return true;
}
function parseJson(json, next, success){
    try{
        json = JSON.parse(json);
    }catch(e){
        return next(e);
    }
    success(json);
}
function responseHandler(err, response, json){

}

module.exports = {

    getThreads: function(res, cb){
        request({
            method: 'get',
            uri: apiUrl + '/threads'
        }, function(err, response, json){
            if(!checkResponse(err, response, cb)){
                return;
            }

            parseJson(json, cb, function(threadlist){
                cb(null, threadlist.threads);
            });
        });
    },

    getThread: function(res, params, cb){
        var uri = apiUrl + '/thread/' + encodeURIComponent(params.threadUrlName) + '/complete';
        
        request({
            method: 'get',
            uri: uri
        }, function(err, response, json){
            if(!checkResponse(err, response, cb)){
                return;
            }
            
            parseJson(json, cb, function(thread){
                cb(null, thread);
            });
        });
    },

    postThread: function(res, body, user, cb){
        body = _(body || {}).extend({
            postedby: user.username
        });

        request({
            method: 'post',
            uri: apiUrl + '/thread',
            form: body
        }, function(err, response, json){
            if(!checkResponse(err, response, cb)){
                return;
            }

            parseJson(json, cb, function(thread){
                cb(null, thread);
            });
        });
    },

    postComment: function(res, body, user, cb){
        request({
            method: 'post',
            uri: apiUrl + '/comment',
            form: {
                postedby: user.username,
                content: body.content,
                threadid: body.threadid
            }
        }, function(err, response, json){
            if(!checkResponse(err, response, cb)){
                return;
            }

            parseJson(json, cb, function(comment){
                cb(null, comment);
            });
        });
    },

    registerUser: function(res, body, cb){
        request({
            method: 'post',
            uri: apiUrl + '/user',
            form: {
                username: body.username,
                password: body.password,
                email: body.email
            }
        }, function(err, response, json){
            if(!checkResponse(err, response, cb)){
                return;
            }

            parseJson(json, cb, function(user){
                cb(null, user);
            });
        });
    },

    handleLogin: function(res, body, cb){
        request({
            method: 'post',
            uri: apiUrl + '/login',
            form: {
                username: body.username,
                password: body.password
            }
        }, function(err, response, json){
            if(!checkResponse(err, response, cb)){
                return;
            }

            parseJson(json, cb, function(data){
                cb(null, data);
            });
        });
    }
};