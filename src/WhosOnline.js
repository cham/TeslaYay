var _ = require('underscore');

var WhosOnline = {
    store: null,
    setStore: function(store){
        this.store = store;
    },
    activeUsers: function(){
        return _(this.store.sessions || {}).reduce(function(memo, session){
            try{
                session = JSON.parse(session);
            }catch(e){}
            
            if(session.user && session.user.username){
                memo.push(session.user);
            }

            return memo;
        }, []);
    },
    activeUsernames: function(){
        return _(this.activeUsers()).map(function(user){
            return user.username;
        });
    },
    activeBuddies: function(buddies){
        var _buddies = _(buddies);

        return _(this.activeUsers()).reduce(function(memo, user){
            if(_buddies.indexOf(user.username) > -1){
                memo.push(user);
            }
            return memo;
        }, []);
    }
};

module.exports = WhosOnline;