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
            numcomments = (req.session.user && req.session.user.preferences.numcomments) || 50;

        return function(err, json){
            if(err) return next(err);

            var totaldocs = json.totaldocs,
                pagesize = json.limit,
                pages = renderUtils.generatePaging({
                    setsize: totaldocs,
                    pagesize: pagesize,
                    activepage: activepage
                }),
                threadpages;

            res.render('index', {
                numthreads: json.threads.length,
                totaldocs: totaldocs,
                pages: pages,
                numpages: pages.length,
                user: req.session.user,
                paginationtext: renderUtils.generatePaginationText({
                    setsize: totaldocs,
                    pagesize: pagesize,
                    activepage: activepage
                }),
                threads: _(json.threads).map(function(thread){
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

                    return thread;
                })
            });
        };
    },

    threadDetailHandler: function(req, res, next){
        var activepage = parseInt(req.route.params.page, 10) || 1;

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