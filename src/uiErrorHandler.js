/*
 * uiErrorHandler, for handling errors with user input
 */

var renderGenerator = require('../src/renderGenerator'),
    routes;

function newThreadError(req, res, next, message){
    var body = req.body;
    body.errorMessage = message;
    renderGenerator.newThreadHandler(req, res, next)(null, body);
}

function preferencesError(req, res, next, message){
    var body = req.body;
    body.errorMessage = message;
    renderGenerator.preferencesHandler(req, res, next)(null, body);
}

function registerError(req, res, next, message){
    var body = req.body;
    body.errorMessage = message;
    renderGenerator.registerHandler(req, res, next)(null, body);
}

function passwordResetError(req, res, next, message){
    var body = req.body;
    body.errorMessage = message;
    renderGenerator.passwordResetHandler(req, res, next)(null, body);
}

routes = {
    login: {
        ValidatorError: {
            'Password failed validation': function(err, req, res, next){
                res.status(401);
                res.end();
            }
        },
        Error: {
            'Invalid credentials': function(err, req, res, next){
                res.status(401);
                res.end();
            },
            'User is banned': function(err, req, res, next){
                res.status(403);
                res.end();
            }
        }
    },
    newthread: {
        Error: {
            'Categories failed validation': function(err, req, res, next){
                newThreadError(req, res, next, 'Please select a category.');
            }
        },
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
            'urlname': function(err, req, res, next){
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
    },
    register: {
        ValidatorError: {
            'Username failed validation': function(err, req, res, next){
                registerError(req, res, next, 'Invalid username');
            },
            'Password failed validation': function(err, req, res, next){
                registerError(req, res, next, 'Your password must be at least 6 characters.');
            },
            'Email failed validation': function(err, req, res, next){
                registerError(req, res, next, 'Please enter a valid email address.');
            }
        },
        MongoDuplicateKey: {
            'email': function(err, req, res, next){
                registerError(req, res, next, 'That email address is already registered');
            },
            'username': function(err, req, res, next){
                registerError(req, res, next, 'That username is already taken');
            }
        }
    },
    'password-reset': {
        ValidatorError: {
            'Confirm password does not match': function(err, req, res, next){
                passwordResetError(req, res, next, 'Your passwords did not match');
            },
            'Username failed validation': function(err, req, res, next){
                passwordResetError(req, res, next, 'There is an error with your username');
            },
            'New password failed validation': function(err, req, res, next){
                passwordResetError(req, res, next, 'Your password must be at least 6 characters.');
            },
            'Confirm password failed validation': function(err, req, res, next){
                passwordResetError(req, res, next, 'Your confirm password must be at least 6 characters.');
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

    if(!err.message){
        return false;
    }
    
    try{
        parsed = JSON.parse(err.message);
    }catch(e){}

    if(parsed && parsed.msg){
        return parsed.msg.indexOf('MongoError: E11000') > -1;
    }
    return err.message.indexOf('MongoError: E11000') > -1;
}

function getErrorType(err){
    if(isMongoDuplicateError(err)){
        return 'MongoDuplicateKey';
    }
    if(err.name){
        return err.name;
    }
    return 'Error';
}

function getErrorMessage(err){
    var mongoDupKeynameMatches;
    if(isMongoDuplicateError(err)){
        mongoDupKeynameMatches = err.message.match(/duplicate key error index:.*?\..*?\.\$(.*?)_/);
        if(mongoDupKeynameMatches.length && mongoDupKeynameMatches.length === 2){
            return mongoDupKeynameMatches[1];
        }
        return 'unknown';
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
