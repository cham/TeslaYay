'use strict';

var express = require('express');

module.exports = function(sessionStore, options){
    var session = express.session({
            secret: 'b33d0g50fc0ur53',
            proxy: true,
            cookie: {
                maxAge: 60 * 60 * 1000
            },
            store: sessionStore
        }),
        generate = sessionStore.generate;

    sessionStore.generate = function(req){
        generate.call(this, req);

        req.session.cookie.secure = req.secure;
    };

    return session;
};