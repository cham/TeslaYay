var _ = require('underscore'),
    urlencode = require('urlencode'),
    setkey = 'onlineusers5',
    expiryTime = 1000 * 60 * 5;

function decode(undecoded){
    return urlencode.decode(undecoded);
}

function getUsers(client, cb){
    client.hgetall(setkey, function(err, users){
        if(err){
            console.log(err);
        }
        cb(users || []);
    });
}

function getOnlineUsers(client, cb){
    getUsers(client, function(users){
        cb(Object.keys(users || {}).map(decode));
    });
}

function setOnlineUsers(client, users){
    (users || []).forEach(function(user){
        client.hset(setkey, user, Date.now());
    });
}

function clearOnlineUsers(client){
    getUsers(client, function(users){
        (users || []).forEach(function(user, username){
            client.hdel(setkey, username);
        });
    });
}

function clearExpiredUsers(client){
    getUsers(client, function(users){
        var key,
            time;

        if(!users){
            return;
        }

        key = Object.keys(users)[0];
        time = parseInt(users[key], 10);

        if((Date.now() - time) > expiryTime){
            client.hdel(setkey, key);
        }
    });
}

var WhosOnline = {
    client: null,
    setStore: function(client){
        this.client = client;
        clearExpiredUsers(client);
    },
    activeUsers: function(theseUsernamesOnly, cb){
        clearExpiredUsers(this.client);

        return getOnlineUsers(this.client, function(users){
            if(theseUsernamesOnly){
                users = users.reduce(function(memo, username){
                    if(theseUsernamesOnly.indexOf(username) > -1){
                        memo.push(username);
                    }
                    return memo;
                }, []);
            }

            cb(users.map(function(user){
                return {
                    username: user,
                    urlname: urlencode(user)
                };
            }));
        });
    },
    activeUsernames: function(cb){
        return this.activeUsers(null, cb);
    },
    setOnline: function(username){
        var client = this.client;

        getOnlineUsers(client, function(users){
            if(users.indexOf(username) === -1){
                setOnlineUsers(client, users.concat(urlencode(username)));
            }
        });
    }
};

module.exports = WhosOnline;
