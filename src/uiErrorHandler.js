/*
 * uiErrorHandler, for handling errors with user input
 */

var routes = {
    login: {
        ValidatorError: {
            'Password failed validation': function(res, data){
                res.status(403);
                res.end();
            }
        }
    }
};

function genericErrorHandler(res){
    res.redirect('/?genericError');
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

module.exports = {
    handleError: function(res, err, data, errorSourceKey){
        var errorType = err.name,
            errorMsg = err.message,
            sourceRoute = getSourceRoute(errorSourceKey),
            errorTypesRoute = getErrorTypeRoute(sourceRoute, errorType),
            errorHandler = getErrorHandler(errorTypesRoute, errorMsg);

        return errorHandler(res, data);
    }
};
