/*
 * renderGenerator
 * generates rendering middleware for use with express routing
 */
var _ = require('underscore'),
    moment = require('moment'),
    renderUtils = require('./renderUtils');

module.exports = {
    
    threadsListingHandler: function(req, res, next){
        var activepage = parseInt(req.route.params.page, 10) || 1,
            numcomments = (req.session.user && req.session.user.preferences.numcomments) || 50,
            user = req.session.user || {},
            that = this;

        return function(err, json){
            json = json || {};
            if(err) return next(err);
            if(!json.threads){
                json.threads = [];
            }

            var totaldocs = json.totaldocs,
                pagesize = json.limit,
                pages = [],
                paginationtext = '0',
                threadpages;

            if(json.threads.length){
                pages = renderUtils.generatePaging({
                    setsize: totaldocs,
                    pagesize: pagesize,
                    activepage: activepage
                });
                paginationtext = renderUtils.generatePaginationText({
                    setsize: totaldocs,
                    pagesize: pagesize,
                    activepage: activepage
                });
            }

            var _userFavourites = _(user.favourites || []),
                _userHidden = _(user.hidden || []);

            res.render('index', {
                numthreads: json.threads.length,
                totaldocs: totaldocs,
                pages: pages,
                numpages: pages.length,
                user: req.session.user,
                paginationtext: paginationtext,
                threads: _(json.threads).map(function(thread){
                    thread.id = thread._id;

                    thread.numcomments = thread.comments.length;
                    threadpages = renderUtils.generatePaging({
                        setsize: thread.numcomments,
                        pagesize: numcomments,
                        activepage: 0
                    });

                    thread.createdago = moment(thread.created).fromNow();
                    thread.lastpostedago = moment(thread.last_comment_time).fromNow();
                    
                    thread.threadpages = threadpages;
                    thread.numpages = threadpages[threadpages.length-1].num;
                    thread.haspagination = threadpages.length > 1;

                    thread.favourite = _userFavourites.indexOf(thread._id) > -1;
                    thread.hidden = _userHidden.indexOf(thread._id) > -1;
                    
                    return thread;
                })
            });
        };
    },

    threadDetailHandler: function(req, res, next){
        var activepage = parseInt(req.route.params.page, 10) || 1,
            that = this;

        return function(err, json){
            if(err) return next(err);

            var totaldocs = json.totaldocs,
                pagesize = json.limit,
                pages = renderUtils.generatePaging({
                    setsize: totaldocs,
                    pagesize: pagesize,
                    activepage: activepage
                }),
                thread;

            if(!json.threads || !json.threads.length){
                return res.redirect('/');
            }
            thread = json.threads[0];

            res.render('thread', {
                id: thread._id,
                title: thread.name,
                threadurlname: thread.urlname,
                author: thread.postedby,
                threadid: thread._id,
                pages: pages,
                paginationtext: renderUtils.generatePaginationText({
                    setsize: totaldocs,
                    pagesize: pagesize,
                    activepage: activepage
                }),
                comments: _(thread.comments).map(function(comment){
                    comment.createdago = moment(comment.created).fromNow();
                    return comment;
                }),
                user: req.session.user
            });
        };
    }
}