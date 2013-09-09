/*
 * Tesla ODM layer
 * mongoose / mongodb
 */
var mongoose = require('mongoose'),
    UserSchema = require('./schema/User');
    
mongoose.connect('mongodb://localhost/tesladb');

module.exports = {
    user: mongoose.model('User', UserSchema)
};