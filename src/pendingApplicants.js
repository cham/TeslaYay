'use strict';
var api = require('./api');
var pendingApplicants = [];
var cacheTime = 1000 * 60 * 5;
var lastFetchTime = Date.now();

function update(cb){
    api.getPendingApplicants(function(err, json){
        if(!err){
            pendingApplicants = json.pendingUsers;
        }
        if(cb){
            cb();
        }
    });
}

function refreshCache(){
    var now = Date.now();
    if(now - lastFetchTime > cacheTime){
        lastFetchTime = now;
        update();
    }
}

function getCount(){
    refreshCache();
    return pendingApplicants.length;
}

function getPendingApplicants(){
    refreshCache();
    return pendingApplicants;
}

update();

exports.getCount = getCount;
exports.getPendingApplicants = getPendingApplicants;
exports.update = update;
