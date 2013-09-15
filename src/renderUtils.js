/*
 * renderUtils
 * set of stateless reusable methods to assist with rendering
 */
var _ = require('underscore');

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
    }
};