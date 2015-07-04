/*
 * renderUtils
 * set of stateless reusable methods to assist with rendering
 */
var _ = require('underscore');
var WhosOnline = require('./WhosOnline');
var pendingApplicants = require('./pendingApplicants');

function pagingObject(num, active){
    return {
        num: num,
        active: active,
        url: num === 1 ? '/' : '/page/' + num.toString()
    };
}
function hasPagingObject(arr, pagingObject){
    return !!_(arr).find(function(po){
        return po.num === pagingObject.num;
    });
}

module.exports = {
    generatePaging: function(options){
        options = options || {};

        var totalpages = Math.ceil(options.setsize / options.pagesize),
            activepage = options.activepage,
            paginationrange = 5,
            paginationstart = activepage - Math.round(paginationrange/2) + 1,
            padding = 2,
            pages = [],
            obj;

        pages.push(pagingObject(1, activepage === 1));
        if(totalpages>1){
            pages.push(pagingObject(2, activepage === 2));
        }
        
        if(activepage > paginationrange){
            pages.push({separator: true});
        }

        _(paginationrange).times(function(i){
            i += paginationstart;
            if(i>0 && totalpages>i){
                obj = pagingObject(i, activepage === i);
                if(!hasPagingObject(pages, obj)){
                    pages.push(obj);
                }
            }
        });

        if(paginationstart+paginationrange < totalpages){
            pages.push({separator: true});

            obj = pagingObject(totalpages-1, activepage === totalpages-1);
            if(!hasPagingObject(pages, obj)){
                pages.push(obj);
            }
        }
        obj = pagingObject(totalpages, activepage === totalpages);
        if(!hasPagingObject(pages, obj)){
            pages.push(obj);
        }

        if(pages.length<2){ pages = []; }
        return pages;
    },

    generatePaginationText: function(options){
        options = options || {};

        var threadindex = ((options.activepage-1) * options.pagesize) + 1,
            lastthreadindex = (threadindex + options.pagesize - 1);

        if(lastthreadindex > options.setsize){
            lastthreadindex = options.setsize;
        }

        return threadindex + ' - ' + lastthreadindex + ' of ' + options.setsize;
    },

    getUserTemplateData: function(user, cb){
        WhosOnline.activeUsers(user.buddies, function(onlinebuddies){
            var numPendingApplicants = pendingApplicants.getCount();
            var inboxsize = user.inbox;
            var pointtime = 1000 * 60 * 60 * 8;
            var inboxtext = 'No New Messages';
            var applicanttext = 'No Applicants';
            var noapplicants = true;

            if(inboxsize > 0){
                inboxtext = inboxsize + ' New Message' + (inboxsize > 1 ? 's' : '');
            }
            if(numPendingApplicants > 0){
                applicanttext = numPendingApplicants + ' Applicant' + (numPendingApplicants > 1 ? 's' : '');
                noapplicants = false;
            }

            cb({
                user: user.username ? user : false,
                onlinebuddies: onlinebuddies,
                numonlinebuddies: (onlinebuddies || []).length,
                numtotalbuddies: (user.buddies || []).length,
                inboxsize: inboxsize || 0,
                inboxtext: inboxtext,
                applicanttext: applicanttext,
                noapplicants: noapplicants,
                email: user.email,
                randomtitles: user.random_titles,
                canpoint: (user.username && !user.lastpointusage) || (new Date().getTime() - new Date(user.lastpointusage).getTime()) > pointtime,
                customcss: user.custom_css,
                customjs: user.custom_js
            });
        });
    }
};
