/*
 * uiErrorHandler, for handling errors with user input
 */

var renderGenerator = require('../src/renderGenerator'),
    routes;

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
                var body = req.body;
                body.errorMessage = 'Please select a category.';
                renderGenerator.newThreadHandler(req, res, next)(null, body);
            },
            'Name failed validation': function(err, req, res, next){
                var body = req.body;
                body.errorMessage = 'Please provide a valid name.';
                renderGenerator.newThreadHandler(req, res, next)(null, body);
            },
            'Content failed validation': function(err, req, res, next){
                var body = req.body;
                body.errorMessage = 'Please give your post some content.';
                renderGenerator.newThreadHandler(req, res, next)(null, body);
            }
        },
        MongoDuplicateKey: {
            'any': function(err, req, res, next){
                var body = req.body;
                body.errorMessage = 'A thread with that name already exists.';
                renderGenerator.newThreadHandler(req, res, next)(null, body);
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
        
        errorType = getErrorType(err);
        sourceRoute = getSourceRoute(errorSourceKey);
        errorTypesRoute = getErrorTypeRoute(sourceRoute, errorType);
        
        errorMsg = getErrorMessage(err);
        errorHandler = getErrorHandler(errorTypesRoute, errorMsg);

        return errorHandler(err, req, res, next);
    }
};
