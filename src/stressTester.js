var nl = require('nodeload'),
    renderGenerator = require('./renderGenerator'),
    api = require('./api');

function randomString(memo, length){
    var num = Math.floor(Math.random()*17);
    length--;
    if(num === 16){
        memo += ' ';
    }else{
        memo += num.toString(16);
    }
    if(length){
        return randomString(memo, length);
    }
    return memo;
}

module.exports = {
    routing: function(app){
        app.get('/stresstarget', this.newcomment);
        app.get('/stresstest', this.runner);
    },
    runner: function(req, res, next){
        var loadtest = nl.run({
            host: 'localhost',
            port: 3100,
            timeLimit: 120,
            targetRps: 500,
            requestGenerator: function(client){
                var request = client.request('GET', "/stresstarget?_=" + Math.floor(Math.random()*100000000));
                request.end();
                return request;
            }
        });
        loadtest.on('end', function() { console.log('Load test done.'); });
    },
    newthread: function(req, res, next){
        api.postThread(res, {
            content: randomString('', 255),
            name: randomString('', 30)
        }, {
            username: 'cham'
        }, function(err, thread){
            if(err){
                return next(err);
            }
            res.redirect('/thread/' + thread.urlname);
        });
    },
    newcomment: function(req, res, next){ // manually set threadid
        var threadUrlName = '064d5450bd570a82a72e3-c81da532';
        api.postComment(res, {
            content: randomString('', 500),
            threadid: '5231efd19f0ed10000005952'
        }, {
            username: 'cham'
        }, function(err, comment){
            res.redirect('/thread/' + encodeURIComponent(threadUrlName) + '#bottom');
        });
    },
    getindex: function(req, res, next){
        api.getThreads(res, req.route.params || {}, req.session.user, renderGenerator.threadslistingHandler(req, res, next));
    },
    getthread: function(req, res, next){
        api.getThread(res, {threadUrlName: '064d5450bd570a82a72e3-c81da532'}, req.session.user, function(err, thread){
            res.render('thread', {
                title: thread.name,
                threadurlname: thread.urlname,
                author: thread.postedby,
                threadid: thread._id,
                comments: _(thread.comments).map(function(comment){
                    comment.createdago = moment(comment.created).fromNow();
                    return comment;
                }),
                user: req.session.user
            });
        });
    }
};