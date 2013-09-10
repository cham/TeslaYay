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
    author = 'cham',
    apiUrl = 'http://localhost:3000';

module.exports = {

    getThreads: function(res, cb){
        request({
            method: 'get',
            uri: apiUrl + '/threads'
        }, function(err, response, json){
            if(err){
                return next(err);
            }

            try{
                json = JSON.parse(json);
            }catch(e){
                return cb(e);
            }
            cb(null, json.threads);
        });
    },

    getThread: function(res, params, cb){
        var uri = apiUrl + '/thread/' + encodeURIComponent(params.threadUrlName) + '/complete';
        
        request({
            method: 'get',
            uri: uri
        }, function(err, response, json){
            if(err){
                return next(err);
            }
            
            try{
                json = JSON.parse(json);
            }catch(e){
                return cb(e);
            }
            cb(null, json);
        });
    },

    postThread: function(res, body, cb){
        body = _(body || {}).extend({
            postedby: author
        });

        request({
            method: 'post',
            uri: apiUrl + '/thread',
            form: body
        }, function(err, response, json){
            if(err){
                return next(err);
            }
            if(response.statusCode === 500){
                return res.end(body);
            }
            
            try{
                json = JSON.parse(json);
            }catch(e){
                return cb(e);
            }
            cb(null, json);
        });
    },

    postComment: function(res, body, cb){
        request({
            method: 'post',
            uri: apiUrl + '/comment',
            form: {
                postedby: author,
                content: body.content,
                threadid: body.threadid
            }
        }, function(err, response, json){
            if(err){
                return next(err);
            }
            if(response.statusCode === 500){
                return res.end('API Error! ' + body);
            }
            
            try{
                json = JSON.parse(json);
            }catch(e){
                return cb(e);
            }
            cb(null, json);
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
        }, function(err, response, body){
            if(err){
                return next(err);
            }
            if(response.statusCode === 500){
                return res.end('API Error! ' + body);
            }
            
            try{
                json = JSON.parse(json);
            }catch(e){
                return cb(e);
            }
            cb(null, json);
        });
    }
};