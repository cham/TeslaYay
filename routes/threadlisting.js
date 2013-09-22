/*
 * threads routing
 *
 * GET
 *      /
 *      /page/:page
 *      /sort/:sorttype
 *      /sort/:sorttype/page/:page
 *      /category/:categories/page/:page
 *      /category/:categories/sort/:sorttype
 *      /category/:categories/sort/:sorttype/page/:page
 *      /participated/page/:page
 *      /participated/sort/:sorttype
 *      /participated/sort/:sorttype/page/:page
 *      /favourites/page/:page
 *      /favourites/sort/:sorttype
 *      /favourites/sort/:sorttype/page/:page
 *      /started/page/:page
 *      /started/sort/:sorttype
 *      /started/sort/:sorttype/page/:page
 *      /hidden/page/:page
 *      /hidden/sort/:sorttype
 *      /hidden/sort/:sorttype/page/:page
 *
 */
var _ = require('underscore');

function checkAuth(req, res, next){
    if(!req.session || !req.session.user || req.session.user.banned){
        if(req.route.method === 'get'){
            return res.redirect('/');
        }
        res.status(401);
        return res.end();
    }
    next();
}

module.exports = function routing(app, api, renderGenerator){

    function buildListing(req, res, next, params){
        params = params || {};
        
        var user = req.session.user,
            page = parseInt((req.route.params.page || '').replace('/', ''), 10),
            sortBy = params.sortBy;

        if(!page || isNaN(page)){
            page = 1;
        }

        api.getTitle(function(err, titlejson){
            if(err) return next(err);
            api.getThreads(
                res,
                _(params || {}).extend({ page: page }),
                user,
                renderGenerator.threadsListingHandler(req, res, {titledata: titlejson, page: page, sortBy: sortBy}, next)
            );
        });
    }

    function makeTypeFilter(type, username){
        type = type || 'participated';
        var apiFilter = {};

        if(type === 'started'){ type = 'postedby'; }
        apiFilter[type] = username;

        return apiFilter;
    }

    function makeSortFilter(type){
        type = type || 'latest';

        if(type === 'started'){ type = 'created'; }
        if(type === 'latest'){ type = 'last_comment_time'; }
        if(type === 'posts'){ type = 'numcomments'; }
        if(type === '-started'){ type = '-created'; }
        if(type === '-latest'){ type = '-last_comment_time'; }
        if(type === '-posts'){ type = '-numcomments'; }

        return {
            sortBy: type
        };
    }

    // thread listing
    app.get('/(page(/:page)?)?', function(req, res, next){
        buildListing(req, res, next);
    });

    // sorting
    app.get('/sort/:sorttype(started|latest|posts|-started|-latest|-posts)', function(req, res, next){
        buildListing(req, res, next, _(req.query || {}).extend(
            makeSortFilter(req.route.params.sorttype)
        ));
    });

    app.get('/sort/:sorttype(started|latest|posts|-started|-latest|-posts)/page/:page', function(req, res, next){
        buildListing(req, res, next, _(req.query || {}).extend(
            makeSortFilter(req.route.params.sorttype)
        ));
    });

    // category search
    app.get('/category/:categories', function(req, res, next){
        buildListing(req, res, next, _(req.query || {}).extend(
            { categories: req.route.params.categories }
        ));
    });

    app.get('/category/:categories/page/:page', function(req, res, next){
        buildListing(req, res, next, _(req.query || {}).extend(
            { categories: req.route.params.categories }
        ));
    });

    app.get('/category/:categories/sort/:sorttype(started|latest|posts|-started|-latest|-posts)', function(req, res, next){
        buildListing(req, res, next, _(req.query || {}).extend(
            { categories: req.route.params.categories },
            makeSortFilter(req.route.params.sorttype)
        ));
    });

    app.get('/category/:categories/sort/:sorttype(started|latest|posts|-started|-latest|-posts)/page/:page', function(req, res, next){
        buildListing(req, res, next, _(req.query || {}).extend(
            { categories: req.route.params.categories },
            makeSortFilter(req.route.params.sorttype)
        ));
    });

    // participated, favourites,  hidden, postedby
    app.get('/:type(participated|favourites|hidden|started)', checkAuth, function(req, res, next){
        buildListing(req, res, next, _(req.query || {}).extend(
            makeTypeFilter(req.route.params.type, req.session.user.username)
        ));
    });

    app.get('/:type(participated|favourites|hidden|started)/page/:page', checkAuth, function(req, res, next){
        buildListing(req, res, next, _(req.query || {}).extend(
            makeTypeFilter(req.route.params.type, req.session.user.username)
        ));
    });

    app.get('/:type(participated|favourites|hidden|started)/sort/:sorttype(started|latest|posts|-started|-latest|-posts)', checkAuth, function(req, res, next){
        buildListing(req, res, next, _(req.query || {}).extend(
            makeTypeFilter(req.route.params.type, req.session.user.username),
            makeSortFilter(req.route.params.sorttype)
        ));
    });

    app.get('/:type(participated|favourites|hidden|started)/sort/:sorttype(started|latest|posts|-started|-latest|-posts)/page/:page', checkAuth, function(req, res, next){
        buildListing(req, res, next, _(req.query || {}).extend(
            makeTypeFilter(req.route.params.type, req.session.user.username),
            makeSortFilter(req.route.params.sorttype)
        ));
    });
};