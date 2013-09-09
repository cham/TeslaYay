/*
 * Tesla API
 * provides a single interface to separate entities of the API
 */
var db = require('./db'),
    users = require('./users');

module.exports = {

    users: users(db)

};