/*
 * renderGenerator
 * generates rendering middleware for use with express routing
 */
var _ = require('underscore'),
    moment = require('moment'),
    renderUtils = require('./renderUtils');

module.exports = {
    
    threadsListingHandler: function(req, res, renderdata, next){
        renderdata = renderdata || {};

        var activepage = renderdata.page,//parseInt(req.route.params.page, 10) || 1,
            user = req.session.user || {},
            numcomments = (user.preferences && user.preferences.numcomments) || 50,
            title = (renderdata.titledata || {}).title,
            titleauthor = (renderdata.titledata || {}).username,
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
                _userHidden = _(user.hidden || []),
                _userBuddies = _(user.buddies || []),
                _userIgnores = _(user.ignores || []),
                paginationroot = (req.url.replace(/\/page(\/[0-9]*)/, '')).replace(/\/\//g, '/').replace(/\/$/,''),
                pageroot = paginationroot.replace(/\/sort(\/[0-9a-z]*)/i, ''),
                flag = 0;

            if(paginationroot === '/'){
                paginationroot = '';
            }

            res.render('index', {
                numthreads: json.threads.length,
                totaldocs: totaldocs,
                pages: pages,
                numpages: pages.length,
                user: user.username ? user : false,
                paginationtext: paginationtext,
                paginationroot: paginationroot,
                pageroot: pageroot,
                title: title,
                titleauthor: titleauthor,
                threads: _(json.threads).map(function(thread){
                    thread.id = thread._id;

                    threadpages = renderUtils.generatePaging({
                        setsize: thread.numcomments,
                        pagesize: numcomments,
                        activepage: 0
                    });

                    thread.createdago = moment(thread.created).fromNow();
                    thread.lastpostedago = moment(thread.last_comment_time).fromNow();
                    
                    thread.threadpages = threadpages;
                    thread.numpages = (threadpages[threadpages.length-1] || {num:1}).num;
                    thread.haspagination = threadpages.length > 1;

                    thread.favourite = _userFavourites.indexOf(thread._id) > -1;
                    thread.hidden = _userHidden.indexOf(thread._id) > -1;

                    flag = 1 - flag;
                    thread.alt = flag;
                    thread.buddy = _userBuddies.indexOf(thread.postedby) > -1;
                    thread.ignored = _userIgnores.indexOf(thread.postedby) > -1;

                    return thread;
                })
            });
        };
    },

    threadDetailHandler: function(req, res, next){
        var user = req.session.user || {},
            activepage = parseInt(req.route.params.page, 10) || 1,
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
                _userBuddies = _(user.buddies || []),
                _userIgnores = _(user.ignores || []),
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
                firstcategory: (thread.categories || []).pop(),
                pages: pages,
                paginationtext: renderUtils.generatePaginationText({
                    setsize: totaldocs,
                    pagesize: pagesize,
                    activepage: activepage
                }),
                comments: _(thread.comments).map(function(comment){
                    comment.id = comment._id;
                    comment.createdago = moment(comment.created).fromNow();
                    comment.buddy = _userBuddies.indexOf(comment.postedby) > -1;
                    comment.ignored = _userIgnores.indexOf(comment.postedby) > -1;
                    return comment;
                }),
                user: user.username ? user : false
            });
        };
    },

    userListingHandler: function(req, res, next){
        var user = req.session.user || {};

        return function(err, json){
            if(err) return next(err);
            json = json || {};

            res.render('buddies', {
                user: user.username ? user : false,
                buddies: json.buddies,
                ignores: json.ignores,
                prefill: json.prefill
            });
        };
    },

    userDetailHandler: function(req, res, next){
        var user = req.session.user || {};

        return function(err, selecteduser){
            if(err) return next(err);
            selecteduser = selecteduser || {};

            var _userBuddies = _(user.buddies || []),
                _userIgnores = _(user.ignores || []),
                created = moment(selecteduser.created),
                daysSince = Math.max(1, created.diff(new Date(), 'days')),
                numcomments = selecteduser.comments_count,
                postsPerDay = numcomments / daysSince;

            res.render('user', {
                user: user.username ? user: false, //probably confusing, rename to 'sessionuser'?
                profilename: selecteduser.username,
                membersince: created.format('MMMM D YYYY'),
                numthreads: selecteduser.threads_count,
                numcomments: numcomments,
                postsperday: postsPerDay,
                buddy: _userBuddies.indexOf(selecteduser.username) > -1,
                ignored: _userIgnores.indexOf(selecteduser.username) > -1
            });
        };
    }
};