/*
 * xss wrapper
 * wraps santitize.xss, but preserves style attribute
 */
var validator_sanitizer = require('validator').sanitize,
    _ = require('underscore');

function XSSWrapper(str){
    this.str = str;

    this.keeplist = [];
    this.pinkies = [
        {code: /\[:\)\]/g, path: '/img/pinkies/11.gif'},
        {code: /\[:\(\]/g, path: '/img/pinkies/01.gif'},
        {code: /\[:D\]/g,  path: '/img/pinkies/05.gif'},
        {code: /\[;\)\]/g, path: '/img/pinkies/07.gif'},
        {code: /\[:P\]/g,  path: '/img/pinkies/08.gif'},
        {code: /\[>\|\]/g, path: '/img/pinkies/14.gif'},
        {code: /\[:\[\]/g, path: '/img/pinkies/10.gif'},
        {code: /\['\(\]/g,   path: '/img/pinkies/03.gif'},
        {code: /\[:\*\]/g,  path: '/img/pinkies/17.gif'},
        {code: /\[B-\]/g,  path: '/img/pinkies/16.gif'},
        {code: /\[:=\]/g,  path: '/img/pinkies/27.gif'},
        {code: /\[:\.\]/g,  path: '/img/pinkies/22.gif'},
        {code: /\[O\]/g,   path: '/img/pinkies/24.gif'},
        {code: /\[8\)\]/g, path: '/img/pinkies/09.gif'},
        {code: /\[:\{\]/g,  path: '/img/pinkies/06.gif'},
        {code: /\[:\@\]/g,  path: '/img/pinkies/20.gif'},
        {code: /\[\%\(\]/g,path: '/img/pinkies/18.gif'},
        {code: /\[><\]/g,  path: '/img/pinkies/25.gif'},
        {code: /\[RR\]/g,  path: '/img/pinkies/23.gif'},
        {code: /\[NH\]/g,  path: '/img/pinkies/26.gif'},
        {code: /\[fbm\]/g, path: '/img/pinkies/21.gif'},
    ];
}

XSSWrapper.prototype.preserve = function(){
    var regstr = 'style=\"(.*?)\"',
        reg = new RegExp(regstr, 'g'),
        matches = this.str.match(reg),
        that = this;

    if(!matches || !matches.length) return;

    _(matches).each(function(match, i){
        that.str = that.str.replace(new RegExp(regstr), 'data-xsswrapperid="' + that.keeplist.length + '"');
        that.keeplist[i] = match;
    });
};

XSSWrapper.prototype.restore = function(){
    var reg, matches, that = this;

    _(this.keeplist).each(function(replaceWith, i){
        reg = new RegExp('data-xsswrapperid=\"'+i+'\"');
        that.str = that.str.replace(reg, that.sanitize(replaceWith));
    });
    this.keeplist = [];
};

XSSWrapper.prototype.sanitize = function(str){
    return validator_sanitizer(str).xss();
};

/* cascade */
XSSWrapper.prototype.clean = function(){
    this.preserve();
    this.str = this.sanitize(this.str);
    this.restore();
    return this;
};

XSSWrapper.prototype.convertNewlines = function(){
    this.str = this.str.replace(/\n/g, '<br>');
    return this;
};

XSSWrapper.prototype.convertPinkies = function(){
    var str = this.str;

    _(this.pinkies).each(function(pinkieData){
        str = str.replace(pinkieData.code, '<img src="' + pinkieData.path + '">');
    });
    this.str = str;

    return this;
};

XSSWrapper.prototype.convertMe = function(user){
    this.str = this.str.replace(/(^|\s|\n|<br>)\/me($|\s|\n|<br>)/g , '$1<a href="/user/' + user.urlname + '">' + user.username + '</a>$2');
    return this;
};

XSSWrapper.prototype.convertYou = function(){
    this.str = this.str.replace(/(^|\s|\n|<br>)\/you($|\s|\n|<br>)/g , '$1<span class="you">you</span>$2');
    return this;
};

/* getter */
XSSWrapper.prototype.value = function(){
    return this.str;
};

module.exports = function(str){
    return new XSSWrapper(str);
};