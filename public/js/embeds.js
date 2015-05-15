window.videoEmbedder = (function(){
    'use strict';

    if(!document.body.addEventListener){
        return {};
    }

    function requiredOptions(options){
        ['type', 'url', 'id'].forEach(function(key){
            if(!options[key]){
                throw new Error(key + ' required');
            }
        });
    }

    function youtubeStartTime(url){
        var timeMatches = url.match(/\?t=([0-9]*m)?([0-9]*s)?$/);
        if(!timeMatches || timeMatches.length !== 3){
            return 0;
        }
        var mins = parseInt(timeMatches[1], 10) || 0;
        var secs = parseInt(timeMatches[2], 10) || 0;
        return mins * 60 + secs;
    }

    function youtubeThumbnailDOM(id){
        var img = document.createElement('img');
        img.src = '//img.youtube.com/vi/' + id + '/0.jpg';
        img.className = 'youtube_placeholder';
        img.title = 'Click to play this video';
        return img;
    }

    function youtubePlaybuttonDOM(uniqueId){
        var div = document.createElement('div');
        div.className = 'youtube_playbutton';
        div.dataset.uniqueId = uniqueId;
        return div;
    }

    function youtubeWrapperDOM(id, url, uniqueId){
        var wrapper = document.createElement('div');
        wrapper.className = 'youtube_wrapper';
        wrapper.appendChild(youtubeThumbnailDOM(id));
        wrapper.appendChild(youtubePlaybuttonDOM(uniqueId));
        return wrapper;
    }

    function youtubeVideoDOM(id, w, h, start){
        var iframe = document.createElement('iframe');
        iframe.width = w;
        iframe.height = h;
        iframe.src = 'https://www.youtube.com/embed/' + id + '?rel=&amp;showinfo=0&amp;start=' + start;
        iframe.frameborder = 0;
        iframe.allowfullscreen = true;
        return iframe;
    }

    function buildEl(){
        var el = document.createElement('div');
        el.className = 'embed-wrapper';
        return el;
    }

    function Embed(options){
        requiredOptions(options || {});

        this.id = options.id;
        this.uniqueId = options.id + embeddedVideos.length;
        this.url = options.url;

        this.el = buildEl();
    }

    Embed.prototype.render = function render(){
        this.el.innerHTML = '';
        this.el.appendChild(youtubeWrapperDOM(this.id, this.url, this.uniqueId));
    };

    Embed.prototype.renderVideo = function renderVideo(w, h){
        this.el.innerHTML = '';
        this.el.appendChild(youtubeVideoDOM(this.id, w, h, youtubeStartTime(this.url)));
    };

    var embeddedVideos = [];

    function embedYoutube(url, id){
        var embed = new Embed({
          url: url,
          id: id,
          type: 'youtube'
        });

        embed.render();

        embeddedVideos.push(embed);

        return embed.el.innerHTML;
    }

    function listenForEvents(node){
        node.addEventListener('click', function(e){
            if(!e.target.className){
                return;
            }
            if(e.target.className.indexOf('youtube_playbutton') > -1){
                embeddedVideos.forEach(function(video){
                    if(video.uniqueId === e.target.dataset.uniqueId){
                        var wrapper = e.target.parentNode;

                        var img = wrapper.getElementsByTagName('img')[0];
                        var w = img.offsetWidth;
                        var h = img.offsetHeight;

                        wrapper.appendChild(video.el);
                        e.target.style.display = 'none';
                        img.style.display = 'none';

                        video.renderVideo(w, h);
                    }
                });
            }
        });

        var lastResize = Date.now();
        var debounceTime = 200;
        window.addEventListener('resize', function(){
            if(Date.now() - lastResize < debounceTime){
                return;
            }
            embeddedVideos.forEach(function(video){
                var iframe = video.el.getElementsByTagName('iframe')[0];
                var aspect = 0.75;
                if(iframe){
                    iframe.height = aspect * iframe.offsetWidth;
                }
            });
            lastResize = Date.now();
        });
    }

    listenForEvents(document.body);

    return {
        embedYoutube: embedYoutube
    };

})();
