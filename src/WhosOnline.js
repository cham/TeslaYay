var _ = require('underscore');

var WhosOnline = {
    store: null,
    setStore: function(store){
        this.store = store;
    },
    activeUsers: function(theseUsernamesOnly){
        var pushedusers = [];
        return _(this.store.sessions || {}).reduce(function(memo, session){
            try{
                session = JSON.parse(session);
            }catch(e){}
            
            if(session.user && session.user.username && pushedusers.indexOf(session.user.username) === -1){
                if(theseUsernamesOnly){
                    if(theseUsernamesOnly.indexOf(session.user.username) > -1){
                        memo.push(session.user);
                        pushedusers.push(session.user.username);
                    }
                }else{
                    memo.push(session.user);
                    pushedusers.push(session.user.username);
                }
            }

            return memo;
        }, []);
    },
    activeUsernames: function(){
        return _(this.activeUsers()).map(function(user){
            return user.username;
        });
    }
};

module.exports = WhosOnline;