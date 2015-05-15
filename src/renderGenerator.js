/*
 * renderGenerator
 * generates rendering middleware for use with express routing
 */
var _ = require('underscore');
var moment = require('moment');
var renderUtils = require('./renderUtils');
var WhosOnline = require('./WhosOnline');
var bcrypt = require('bcrypt');
var pendingApplicants = require('./pendingApplicants');

function getUserWebsiteValue(websites, key){
    var match = _.find(websites, function(website){
        return website.name === key;
    });

    if(!match){
        return '';
    }
    return match.url || '';
}

function getGetOrdinal(n){
    var s=["th","st","nd","rd"],
        v=n%100;
    return n+(s[(v-20)%10]||s[v]||s[0]);
}

module.exports = {
    
    threadsListingHandler: function(req, res, renderdata, next){
        renderdata = renderdata || {};

        var activepage = renderdata.page;
        var user = req.session.user || {};
        var numcomments = (user.comment_size) || 50;
        var title = (renderdata.titledata || {}).title;
        var titleauthor = (renderdata.titledata || {}).username;
        var sortBy = renderdata.sortBy;
        var that = this;


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

            renderUtils.getUserTemplateData(user, function(templateData){
                res.render('index', _.extend(templateData, {
                    numthreads: json.threads.length,
                    totaldocs: totaldocs,
                    pages: pages,
                    numpages: pages.length,
                    paginationtext: paginationtext,
                    paginationroot: paginationroot,
                    pageroot: pageroot,
                    title: 'YayHooray',
                    randomtitle: title,
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
                        thread.singlepage = thread.numpages === 1;
                        thread.haspagination = threadpages.length > 1;

                        thread.favourite = _userFavourites.indexOf(thread._id) > -1;
                        thread.ishidden = _userHidden.indexOf(thread._id) > -1;

                        flag = 1 - flag;
                        thread.alt = flag;
                        thread.buddy = _userBuddies.indexOf(thread.postedby) > -1;
                        thread.ignored = _userIgnores.indexOf(thread.postedby) > -1;
                        thread.removed = user.hide_enemy_posts && _userIgnores.indexOf(thread.postedby) > -1;

                        return thread;
                    })
                }));
            });
        };
    },

    errorPageHandler: function(req, res, renderdata, next){
        var user = req.session.user || {},
            title = (renderdata.titledata || {}).title,
            titleauthor = (renderdata.titledata || {}).username,
            errorMessage = (renderdata || {}).errorMessage,
            gameData = (renderdata || {}).gameData;

        renderUtils.getUserTemplateData(user, function(templateData){
            res.status(500);
            res.render('error', _.extend(templateData, gameData, {
                title: title,
                titleauthor: titleauthor,
                errorMessage: errorMessage
            }));
        });
    },

    threadDetailHandler: function(req, res, next){
        var user = req.session.user || {},
            activepage = parseInt(req.route.params.page, 10) || 1,
            that = this;

        return function(err, json){
            if(err){
                if(err.message === 'Login required'){
                    return renderUtils.getUserTemplateData(user, function(templateData){
                        res.render('login-required', templateData);
                    });
                }
                return next(err);
            }

            var totaldocs = json.totaldocs,
                pagesize = json.limit,
                pages = renderUtils.generatePaging({
                    setsize: totaldocs,
                    pagesize: pagesize,
                    activepage: activepage
                }),
                _userBuddies = _(user.buddies || []),
                _userIgnores = _(user.ignores || []),
                thread,
                lastcomment;

            if(!json.threads || !json.threads.length){
                return res.redirect('/');
            }
            thread = json.threads[0];

            var authedUserCanPost = thread.postedby_ignores.indexOf(user.username) === -1;

            /**
             *  Adding favourites and hidden to context
             */

            var userFavourites = user.favourites || [],
                userHidden = user.hidden || [];

            thread.favourite = userFavourites.indexOf(thread._id) > -1;
            thread.ishidden = userHidden.indexOf(thread._id) > -1;

            renderUtils.getUserTemplateData(user, function(templateData){
                res.render('thread', _.extend(templateData, {
                    id: thread._id,
                    title: thread.name,
                    threadurlname: thread.urlname,
                    author: thread.postedby,
                    threadid: thread._id,
                    firstcategory: (thread.categories || []).pop(),
                    pages: pages,
                    viewhtml: user.view_html === false ? false : true,
                    paginationtext: renderUtils.generatePaginationText({
                        setsize: totaldocs,
                        pagesize: pagesize,
                        activepage: activepage
                    }),
                    errorMessage: json.errorMessage,
                    closed: thread.closed,
                    nsfw: thread.nsfw,
                    comments: _(thread.comments).map(function(comment, index){
                        var dayslater = lastcomment ? moment(comment.created).diff(moment(lastcomment.created),'days') : 0,
                            newcomment = _.extend({
                                id: comment._id,
                                createdago: moment(comment.created).fromNow(),
                                buddy: _userBuddies.indexOf(comment.postedby) > -1,
                                ignored: _userIgnores.indexOf(comment.postedby) > -1,
                                removed: user.hide_enemy_posts && _userIgnores.indexOf(comment.postedby) > -1,
                                toggleSourceLabel: (index === 0 && user.username === comment.postedby) || (comment.postedby === user.username && moment(comment.created).diff(new Date())>-3600000) ? 'Edit Post' : 'View Source',
                                editPercent: Math.floor(comment.edit_percent),
                                haspoints: comment.points > 0,
                                hasmultiplepoints: comment.points > 1,
                                dayslater: dayslater,
                                dayslaterbanner: dayslater > 1,
                                canpoint: templateData.canpoint && user.username !== comment.postedby,
                                showthreadcontrols: index === 0 && activepage === 1 && user.username === thread.postedby,
                                avatarurl: comment.postedby.replace(/\s/g,'-'),
                                worths: comment.points > 4
                            }, comment);

                        lastcomment = comment;
                        return newcomment;
                    }),
                    authedusercanpost: authedUserCanPost,
                    favourite: thread.favourite,
                    ishidden: thread.ishidden
                }));
            });
        };
    },

    buddyListingHandler: function(req, res, next){
        var user = req.session.user || {};

        return function(err, json){
            if(err) return next(err);
            json = json || {};

            var pages = renderUtils.generatePaging({
                setsize: json.totalbuddies,
                pagesize: 25,
                activepage: json.page
            });
            var paginationtext = renderUtils.generatePaginationText({
                setsize: json.totalbuddies,
                pagesize: 25,
                activepage: json.page
            });
            var paginationroot = (req.url.replace(/\/page(\/[0-9]*)/, '')).replace(/\/\//g, '/').replace(/\/$/,'');

            renderUtils.getUserTemplateData(user, function(templateData){
                res.render('buddies', _.extend(templateData, {
                    buddies: json.buddies,
                    ignores: json.ignores,
                    prefill: json.prefill,
                    page: json.page,
                    pages: pages,
                    numpages: pages.length,
                    paginationtext: paginationtext,
                    paginationroot: paginationroot
                }));
            });
        };
    },

    userListingHandler: function(req, res, next){
        var user = req.session.user || {},
            _userBuddies = _(user.buddies),
            _userEnemies = _(user.enemies);

        return function(err, json){
            if(err) return next(err);
            json = json || {};

            var pages = renderUtils.generatePaging({
                setsize: json.totaldocs,
                pagesize: 25,
                activepage: json.page
            });
            var paginationtext = renderUtils.generatePaginationText({
                setsize: json.totaldocs,
                pagesize: 25,
                activepage: json.page
            });
            var paginationroot = (req.url.replace(/\/page(\/[0-9]*)/, '')).replace(/\/\//g, '/').replace(/\/$/,'');

            renderUtils.getUserTemplateData(user, function(templateData){
                res.render('users', _.extend(templateData, {
                    users: json.users.map(function(singleuser){
                        var isbuddy = _userBuddies.indexOf(singleuser.username) > -1,
                            isenemy = _userEnemies.indexOf(singleuser.username) > -1;

                        return _.extend(singleuser, {
                            created: moment(singleuser.created).format('MMM Do YY'),
                            last_login: moment(singleuser.last_login).format('MMM Do YY'),
                            isbuddy: isbuddy,
                            isenemy: isenemy,
                            isregular: !(isbuddy || isenemy)
                        });
                    }),
                    pages: pages,
                    numpages: pages.length,
                    paginationtext: paginationtext,
                    paginationroot: paginationroot
                }));
            });
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
                realname = selecteduser.realname && selecteduser.realname.length ? selecteduser.realname : false,
                location = selecteduser.location && selecteduser.location.length ? selecteduser.location : false;

            WhosOnline.activeUsers([selecteduser.username], function(onlineuser){
                if(!canpoint){
                    nextpointtime = moment(lastpointusage).add(pointtime/1000, 'seconds').fromNow();
                }

                renderUtils.getUserTemplateData(user, function(templateData){
                    res.render('user', _.extend(templateData, {
                        membernumber: getGetOrdinal(selecteduser.membernumber),
                        profilename: selecteduser.username,
                        realname: realname,
                        location: location,
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
                        flickr: getWebsiteUrl(selecteduser.websites, 'flickr_username'),
                        lastfm: getWebsiteUrl(selecteduser.websites, 'lastfm'),
                        twitter: getWebsiteUrl(selecteduser.websites, 'twitter'),
                        about: selecteduser.about,
                        online: onlineuser.length > 0,
                        viewhtml: user.view_html,
                        numbuddyof: selecteduser.numbuddyof,
                        comments: _(selecteduser.comments || []).reduce(function(memo, comment){
                            var thread = comment.threadid || {};
                            memo.push({
                                threadurl: thread.urlname,
                                threadtitle: thread.name,
                                content: comment.content
                            });
                            return memo;
                        }, [])
                    }));
                });
            });
        };
    },

    inboxHandler: function(req, res, next){
        var user = req.session.user || {};

        return function(err, json){
            if(err) return next(err);

            var messages = json.messages || [];

            renderUtils.getUserTemplateData(user, function(templateData){
                res.render('inbox', _.extend(templateData, {
                    messages: _(messages).map(function(message, i){
                        message.createdago = moment(message.created).fromNow();
                        message.odd = !!(i%2);
                        return message;
                    })
                }));
            });
        };
    },

    outboxHandler: function(req, res, next){
        var user = req.session.user || {};

        return function(err, json){
            if(err) return next(err);

            var messages = json.messages || [];

            renderUtils.getUserTemplateData(user, function(templateData){
                res.render('outbox', _.extend(templateData, {
                    messages: _(messages).map(function(message, i){
                        message.createdago = moment(message.created).fromNow();
                        message.odd = !!(i%2);
                        return message;
                    })
                }));
            });
        };
    },

    messageHandler: function(req, res, next){
        var user = req.session.user || {};

        return function(err, message){
            if(err) return next(err);

            renderUtils.getUserTemplateData(user, function(templateData){
                message.created = moment(message.created).format('MMM Do \'YY @ h:mma');
                res.render('message', _.extend(templateData, message, {
                    viewhtml: user.view_html
                }));
            });
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

            renderUtils.getUserTemplateData(user, function(templateData){
                res.render('sendmessage', _.extend(templateData, message));
            });
        };
    },

    newThreadHandler: function(req, res, next){
        var user = req.session.user || {};

        return function(err, postedData){
            var postedCategories = (postedData || {}).categories || [];
            if(err) return next(err);

            renderUtils.getUserTemplateData(user, function(templateData){
                res.render('post', _.extend(templateData, postedData, {
                    discussionsselected: postedCategories.indexOf('Discussions') > -1,
                    projectsselected: postedCategories.indexOf('Projects') > -1,
                    adviceselected: postedCategories.indexOf('Advice') > -1,
                    meaninglessselected: postedCategories.indexOf('Meaningless') > -1
                }));
            });
        };
    },

    preferencesHandler: function(req, res, next){
        var user = req.session.user || {};

        return function(err, preferences){
            if(err) return next(err);

            renderUtils.getUserTemplateData(user, function(templateData){
                res.render('preferences', _.extend(templateData, {
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
                    errorMessage: preferences.errorMessage,
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
            });
        };
    },

    registerHandler: function(req, res, next){
        return function(err, data){
            if(err) return next(err);

            if(data.questions){
                data.question1 = data.questions[0]._id;
                data.detail1 = data.questions[0].detail;
                data.question2 = data.questions[1]._id;
                data.detail2 = data.questions[1].detail;
                data.question3 = data.questions[2]._id;
                data.detail3 = data.questions[2].detail;
            }

            res.render('register', data);
        };
    },

    forgotPasswordHandler: function(req, res, next){
        return function(err, data){
            if(err) return next(err);
            res.render('forgot-password', data);
        };
    },

    passwordResetHandler: function(req, res, next){
        return function(err, data){
            if(err) return next(err);

            var query = req.query;
            var body = req.body;

            var username = query.username || body.username;
            var token = query.token || body.token;
            var compareStr = username + ':topsecret:' + moment().format('YYYY-MM-DD');

            if(!bcrypt.compareSync(compareStr, token)){
                return next(new Error('token is invalid'));
            }

            res.render('password-reset', {
                errorMessage: body.errorMessage,
                username: username,
                token: token
            });
        };
    },

    chatHandler: function(req, res, next){
        var user = req.session.user || {};

        return function(err, data){
            renderUtils.getUserTemplateData(user, function(templateData){
                res.render('chat', templateData);
            });
        };
    },

    pendingRegistrationsHandler: function(req, res, next){
        var user = req.session.user || {};

        return function(err, data){
            pendingApplicants.update(function(){
                renderUtils.getUserTemplateData(user, function(templateData){
                    templateData.pendingUsers = pendingApplicants.getPendingApplicants().map(function(applicant){
                        applicant.pointstext = applicant.points + ' point' + (applicant.points === 1 ? '' : 's');
                        return applicant;
                    });
                    res.render('pendingregistrations', templateData);
                });
            });
        };
    }
};
