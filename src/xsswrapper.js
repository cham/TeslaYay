/*
 * xss wrapper
 * wraps santitize.xss, but preserves style attribute
 */
var validator_sanitizer = require('validator').sanitize;

function XSSWrapper(str){
    this.str = str;

    this.keeplist = [];
}

XSSWrapper.prototype.preserve = function(){
    var regstr = 'style=\"(.*?)\"',
        reg = new RegExp(regstr, 'g'),
        matches = this.str.match(reg);

    if(!matches || !matches.length) return;

    for(var i in matches){
        this.str = this.str.replace(new RegExp(regstr), 'data-xsswrapperid="' + this.keeplist.length + '"');
        this.keeplist[i] = matches[i];
    }
};

XSSWrapper.prototype.restore = function(){
    var reg, matches;

    for(var i in this.keeplist){
        reg = new RegExp('data-xsswrapperid=\"'+i+'\"');
        this.str = this.str.replace(reg, this.sanitize(this.keeplist[i]));
    }
    this.keeplist = [];
};

XSSWrapper.prototype.sanitize = function(str){
    return validator_sanitizer(str).xss();
};

XSSWrapper.prototype.clean = function(){
    this.preserve();
    this.str = this.sanitize(this.str);
    this.restore();
    return this.str;
};

module.exports = function(str){
    return new XSSWrapper(str);
};