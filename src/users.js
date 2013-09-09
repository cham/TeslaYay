/*
 * Tesla api methods for accessing and manipulating user data
 */
var _ = require('underscore'),
    crypto = require('crypto');

function summaryMapping(dbdoc){
    return {
        username: dbdoc.username,
        comments_count: dbdoc.comments_count,
        threads_count: dbdoc.threads_count,
        points: dbdoc.points,
        lastpointusage: dbdoc.lastpointusage,
        view_html: dbdoc.view_html,
        last_login: dbdoc.last_login,
        hide_enemy_posts: dbdoc.hide_enemy_posts,
        timezone: dbdoc.timezone,
        random_titles: dbdoc.random_titles,
        banned: dbdoc.banned
    };
}

module.exports = function(db){
    return {
        listUsers: function(options, done){
            db.user
                .find()
                .exec(function(err, users){
                    if(err){
                        return done(err);
                    }

                    done(null,{
                        'users': options.summary ?
                                    _(users || [])
                                        .chain()
                                        .filter(function(user){
                                            return user.username;
                                        })
                                        .map(summaryMapping)
                                        .value()
                                    :
                                    users
                    });
                });
        },

        getUser: function(options, done){
            db.user
                .findOne({username: options.username})
                .exec(function(err, user){
                    if(err){
                        return done(err);
                    }

                    if(!user || !user.activated || user.banned){
                        return done(null,{});
                    }

                    done(null,
                        options.summary ?
                            summaryMapping(user)
                            :
                            user
                    );
                });
        },

        addUser: function(options, done){
            var now = new Date(),
                user = new db.user({
                    username: options.username,
                    password: crypto
                                .createHash("md5")
                                .update(options.password)
                                .digest("hex"),
                    email: options.email,
                    last_ip: options.ip,
                    last_login: now,
                    created: now,
                    modified: now
                }),
                that = this;

            user.save(function(err){
                if(err){
                    return done(err);
                }

                return that.getUser({username: options.username}, done);
            });
        },

        deleteUser: function(options, done){
            if(!options.username){
                return done(new Error('username is required'));
            }

            db.user
                .findOne({username: options.username})
                .remove(function(err, success){
                    if(err){
                        return done(err);
                    }
                    done();
                });
        },

        deleteAllUsers: function(done){
            db.user
                .find()
                .remove(function(err){
                    if(err){
                        return done(err);
                    }
                    done();
                });
        }
    };
};