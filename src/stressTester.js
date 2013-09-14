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

var testthread = {
        _id: '52334830c11df6c26e000002',
        urlname: 'dan-s-thread',
        username: 'dan'
    };

// current yay stats
// users: 2875
// comments: 1073586
// threads: 25714

module.exports = {
    routing: function(app){
        app.get('/stresstarget', this.randomcomment);
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
    // test targets
    newthread: function(req, res, next){
        api.postThread(res, {
            content: randomString('', 255),
            name: randomString('', 30)
        }, {
            username: testthread.username
        }, function(err, thread){
            if(err){
                return next(err);
            }
            res.redirect('/thread/' + thread.urlname);
        });
    },
    newcomment: function(req, res, next){
        api.postComment(res, {
            content: randomString('', 500),
            threadid: testthread._id
        }, {
            username: testthread.username
        }, function(err, comment){
            res.redirect('/thread/' + encodeURIComponent(testthread.urlname) + '#bottom');
        });
    },
    randomcomment: function(req, res, next){
        api.getRandomThread(res, {}, req.session.user, function(err, json){
            var thread = json.threads[0];
console.log(thread);
            api.postComment(res, {
                content: randomString('', 500),
                threadid: thread._id
            }, {
                username: testthread.username
            }, function(err, comment){
                res.redirect('/thread/' + encodeURIComponent(thread.urlname) + '#bottom');
            });
        });
    },
    getindex: function(req, res, next){
        api.getThreads(res, req.route.params || {}, req.session.user, renderGenerator.threadslistingHandler(req, res, next));
    },
    getthread: function(req, res, next){
        api.getThread(res, {threadUrlName: testthread._id}, req.session.user, function(err, thread){
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