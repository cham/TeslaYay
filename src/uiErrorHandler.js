/*
 * uiErrorHandler, for handling errors with user input
 */

var renderGenerator = require('../src/renderGenerator'),
    routes;

function preferencesError(req, res, next, message){
    var body = req.body;
    body.errorMessage = message;
    renderGenerator.preferencesHandler(req, res, next)(null, body);
}

function newThreadError(req, res, next, message){
    var body = req.body;
    body.errorMessage = message;
    renderGenerator.newThreadHandler(req, res, next)(null, body);
}

routes = {
    login: {
        ValidatorError: {
            'Password failed validation': function(err, req, res, next){
                res.status(403);
                res.end();
            }
        }
    },
    newthread: {
        ValidatorError: {
            'Categories failed validation': function(err, req, res, next){
                newThreadError(req, res, next, 'Please select a category.');
            },
            'Name failed validation': function(err, req, res, next){
                newThreadError(req, res, next, 'Please provide a valid name.');
            },
            'Content failed validation': function(err, req, res, next){
                newThreadError(req, res, next, 'Please give your post some content.');
            }
        },
        MongoDuplicateKey: {
            'any': function(err, req, res, next){
                newThreadError(req, res, next, 'A thread with that name already exists.');
            }
        }
    },
    postcomment: {
        ValidatorError: {
            'Content failed validation': function(err, req, res, next){
                var body = req.body;
                body.errorMessage = 'Please give your post some content.';
                renderGenerator.threadDetailHandler(req, res, next)(null, body);
            }
        }
    },
    preferences: {
        ValidatorError: {
            'Old password failed validation': function(err, req, res, next){
                preferencesError(req, res, next, 'Your original password must be at least 6 characters.');
            },
            'New password failed validation': function(err, req, res, next){
                preferencesError(req, res, next, 'Your new password must be at least 6 characters.');
            },
            'Confirm password failed validation': function(err, req, res, next){
                preferencesError(req, res, next, 'Confirm new password must be at least 6 characters.');
            },
            'Confirm password does not match': function(err, req, res, next){
                preferencesError(req, res, next, 'Your new password and confirm password do not match.');
            },
            'Email failed validation': function(err, req, res, next){
                preferencesError(req, res, next, 'Please enter a valid email address.');
            },
            'Custom CSS failed validation': function(err, req, res, next){
                preferencesError(req, res, next, 'Custom CSS must be a valid URL.');
            }
        },
        Error: {
            'Wrong file type': function(err, req, res, next){
                preferencesError(req, res, next, 'Invalid file.');
            }
        }
    }
};



function genericErrorHandler(err, req, res, next){
    res.redirect(req.headers['referer']);
}

function getSourceRoute(key){
    return routes[key] || {};
}

function getErrorTypeRoute(subroute, errType){
    return subroute[errType] || {};
}

function getErrorHandler(subroute, errMsg){
    return subroute[errMsg] || genericErrorHandler;
}

function isMongoDuplicateError(err){
    var parsed;

    if(err.message){
        try{
            parsed = JSON.parse(err.message);
        }catch(e){}
    }
    if(parsed && parsed.msg){
        return parsed.msg.indexOf('MongoError: E11000') > -1;
    }
    return false;
}

function getErrorType(err){
    var parsed;
    
    if(isMongoDuplicateError(err)){
        return 'MongoDuplicateKey';
    }
    if(err.name){
        return err.name;
    }

    return parsed;
}

function getErrorMessage(err){
    if(isMongoDuplicateError(err)){
        return 'any';
    }
    return err.message;
}

module.exports = {
    handleError: function(err, req, res, next, errorSourceKey){
        var errorType,
            errorMsg,
            sourceRoute,
            errorTypesRoute,
            errorHandler;

        if(Array.isArray(err)){
            err = err[0];
        }
        if(!err){
            err = {};
        }
        
        errorType = getErrorType(err);
        sourceRoute = getSourceRoute(errorSourceKey);
        errorTypesRoute = getErrorTypeRoute(sourceRoute, errorType);
        
        errorMsg = getErrorMessage(err);
        errorHandler = getErrorHandler(errorTypesRoute, errorMsg);

        return errorHandler(err, req, res, next);
    }
};