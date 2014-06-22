/*
 * renderGenerator
 * generates rendering middleware for use with express routing
 */
var _ = require('underscore'),
    moment = require('moment'),
    renderUtils = require('./renderUtils'),
    WhosOnline = require('./WhosOnline');

function getUserWebsiteValue(websites, key){
    var match = _.find(websites, function(website){
        return website.name === key;
    });

    if(!match){
        return '';
    }
    return match.url || '';
}

module.exports = {
    
    threadsListingHandler: function(req, res, renderdata, next){
        renderdata = renderdata || {};

        var activepage = renderdata.page,//parseInt(req.route.params.page, 10) || 1,
            user = req.session.user || {},
            numcomments = (user.comment_size) || 50,
            title = (renderdata.titledata || {}).title,
            titleauthor = (renderdata.titledata || {}).username,
            sortBy = renderdata.sortBy,
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
                pageroot = paginationroot.replace(/\/sort(\/[0-9a-z-]*)/i, ''),
                flag = 0;

            if(paginationroot === '/'){
                paginationroot = '';
            }

            res.render('index', _(renderUtils.getUserTemplateData(user)).extend({
                numthreads: json.threads.length,
                totaldocs: totaldocs,
                pages: pages,
                numpages: pages.length,
                paginationtext: paginationtext,
                paginationroot: paginationroot,
                pageroot: pageroot,
                title: title,
                titleauthor: titleauthor,
                sortingStarted: sortBy === '-created',
                sortingLatest: sortBy === '-last_comment_time',
                sortingPosts: sortBy === '-numcomments',
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
                    thread.ishidden = _userHidden.indexOf(thread._id) > -1;

                    flag = 1 - flag;
                    thread.alt = flag;
                    thread.buddy = _userBuddies.indexOf(thread.postedby) > -1;
                    thread.ignored = _userIgnores.indexOf(thread.postedby) > -1;

                    return thread;
                })
            }));
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

            res.render('thread', _(renderUtils.getUserTemplateData(user)).extend({
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
                    return _(comment).extend({
                        id: comment._id,
                        createdago: moment(comment.created).fromNow(),
                        buddy: _userBuddies.indexOf(comment.postedby) > -1,
                        ignored: _userIgnores.indexOf(comment.postedby) > -1,
                        toggleSourceLabel: (comment.postedby === user.username && moment(comment.created).diff(new Date())>-600000) ? 'Edit Post' : 'View Source',
                        editPercent: Math.floor(comment.edit_percent),
                        haspoints: comment.points > 0,
                        hasmultiplepoints: comment.points > 1
                    });
                })
            }));
        };
    },

    userListingHandler: function(req, res, next){
        var user = req.session.user || {};

        return function(err, json){
            if(err) return next(err);
            json = json || {};

            res.render('buddies', _(renderUtils.getUserTemplateData(user)).extend({
                buddies: json.buddies,
                ignores: json.ignores,
                prefill: json.prefill
            }));
        };
    },

    userDetailHandler: function(req, res, next){
        var user = req.session.user || {};

        function getWebsiteUrl(websites, name){
            var website = _.findWhere(websites, {name: name});
            if(!website || !website.url){
                return;
            }
            return website.url;
        }

        return function(err, selecteduser){
            if(err) return next(err);
            selecteduser = selecteduser || {};

            var _userBuddies = _(user.buddies || []),
                _userIgnores = _(user.ignores || []),
                created = moment(selecteduser.created),
                lastlogin = moment(selecteduser.last_login),
                daysSince = Math.max(1, Math.abs(created.diff(new Date(), 'days'))),
                numcomments = selecteduser.comments_count,
                postsPerDay = Math.floor(numcomments / daysSince),
                pointtime = 1000 * 60 * 60 * 8,
                lastpointusage = selecteduser.lastpointusage || new Date(0,0,0),
                nextpointtime = 'right now',
                canpoint = (new Date().getTime() - new Date(lastpointusage).getTime()) > pointtime,
                isOnline = WhosOnline.activeUsers([selecteduser.username]).length > 0;

            if(!canpoint){
                nextpointtime = moment(lastpointusage).add(pointtime/1000, 'seconds').fromNow();
            }

            res.render('user', _(renderUtils.getUserTemplateData(user)).extend({
                profilename: selecteduser.username,
                membersince: created.format('MMMM D YYYY'),
                lastlogin: lastlogin.format('MMMM D YYYY') + ' at ' + lastlogin.format('h:mm a'), //September 16th 2013 at 4:47 pm
                numthreads: selecteduser.threads_count,
                numcomments: numcomments,
                postsperday: postsPerDay,
                buddy: _userBuddies.indexOf(selecteduser.username) > -1,
                ignored: _userIgnores.indexOf(selecteduser.username) > -1,
                nextpointtime: nextpointtime,
                points: selecteduser.points,
                website1: getWebsiteUrl(selecteduser.websites, 'website_1'),
                website2: getWebsiteUrl(selecteduser.websites, 'website_2'),
                website3: getWebsiteUrl(selecteduser.websites, 'website_3'),
                aim: getWebsiteUrl(selecteduser.websites, 'aim'),
                gchat: getWebsiteUrl(selecteduser.websites, 'gchat'),
                msn: getWebsiteUrl(selecteduser.websites, 'msn'),
                facebook: getWebsiteUrl(selecteduser.websites, 'facebook'),
                flickr: getWebsiteUrl(selecteduser.websites, 'flickr'),
                lastfm: getWebsiteUrl(selecteduser.websites, 'lastfm'),
                twitter: getWebsiteUrl(selecteduser.websites, 'twitter'),
                about: selecteduser.about,
                comments: selecteduser.comments.reduce(function(memo, comment){
                    var thread = comment.threadid || {};
                    memo.push({
                        threadurl: thread.urlname,
                        threadtitle: thread.name,
                        content: comment.content
                    });
                    return memo;
                }, []),
                online: isOnline
            }));
        };
    },

    inboxHandler: function(req, res, next){
        var user = req.session.user || {};

        return function(err, json){
            if(err) return next(err);

            var messages = json.messages || [];

            res.render('inbox', _(renderUtils.getUserTemplateData(user)).extend({
                messages: _(messages).map(function(message, i){
                    message.createdago = moment(message.created).fromNow();
                    message.odd = !!(i%2);
                    return message;
                })
            }));
        };
    },

    outboxHandler: function(req, res, next){
        var user = req.session.user || {};

        return function(err, json){
            if(err) return next(err);

            var messages = json.messages || [];

            res.render('outbox', _(renderUtils.getUserTemplateData(user)).extend({
                messages: _(messages).map(function(message, i){
                    message.createdago = moment(message.created).fromNow();
                    message.odd = !!(i%2);
                    return message;
                })
            }));
        };
    },

    messageHandler: function(req, res, next){
        var user = req.session.user || {};

        return function(err, message){
            if(err) return next(err);

            res.render('message', _(renderUtils.getUserTemplateData(user)).extend(message));
        };
    },

    messageSendHandler: function(req, res, next){
        var user = req.session.user || {};

        return function(err, message){
            if(err) return next(err);

            if(message.subject){
                message.replysubject = 'RE: ' + message.subject;
            }
            if(message.content){
                message.replycontent = "\n\n\n-----------------------------\n\n" + message.content;
            }

            res.render('sendmessage', _(renderUtils.getUserTemplateData(user)).extend(message));
        };
    },

    newThreadHandler: function(req, res, next){
        var user = req.session.user || {};

        return function(err, message){
            if(err) return next(err);

            res.render('post', renderUtils.getUserTemplateData(user));
        };
    },

    preferencesHandler: function(req, res, next){
        var user = req.session.user || {};

        return function(err, preferences){
            if(err) return next(err);

            res.render('preferences', _(renderUtils.getUserTemplateData(user)).extend({
                realname: user.realname,
                location: user.location,
                about: user.about,
                website1: getUserWebsiteValue(user.websites, 'website_1'),
                website2: getUserWebsiteValue(user.websites, 'website_2'),
                website3: getUserWebsiteValue(user.websites, 'website_3'),
                flickr: getUserWebsiteValue(user.websites, 'flickr_username'),
                facebook: getUserWebsiteValue(user.websites, 'facebook'),
                aim: getUserWebsiteValue(user.websites, 'aim'),
                gchat: getUserWebsiteValue(user.websites, 'gchat'),
                lastfm: getUserWebsiteValue(user.websites, 'lastfm'),
                msn: getUserWebsiteValue(user.websites, 'msn'),
                twitter: getUserWebsiteValue(user.websites, 'twitter'),
                sfwtitle: !user.random_titles,
                fixedchatsize: user.fixed_chat_size,
                hideenemyposts: user.hide_enemy_posts,
                customcssurl: user.custom_css,
                customjsurl: user.custom_js,
                threadsperpage: [
                    {value: 25,  selected: user.thread_size === 25},
                    {value: 50,  selected: user.thread_size === 50},
                    {value: 100, selected: user.thread_size === 100}
                ],
                commentsperpage: [
                    {value: 25,  selected: user.comment_size === 25},
                    {value: 50,  selected: user.comment_size === 50},
                    {value: 100, selected: user.comment_size === 100}
                ]
            }));
        };
    }
};