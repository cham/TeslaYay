var mongoose = require('mongoose'),
    UserSchema = new mongoose.Schema({
        username: {type: String, index: {unique: true, dropDups: true}},
        password: String,
        email: {type: String, index: {unique: true, dropDups: true}},
        activated: {type: Boolean, default: true},
        banned: {type: Boolean, default: false},
        ban_reason: String,
        last_ip: String,
        last_login: Date,
        created: Date,
        modified: Date,
        view_html: {type: Boolean, default: true},
        random_titles: {type: Boolean, default: true},
        timezone: {type: Number, default: 0},
        emoticon: String,
        custom_css: String,
        threads_count: {type: Number, default: 0},
        comments_count: {type: Number, default: 0},
        hide_enemy_posts: {type: Boolean, default: true},
        custom_js: String,
        hide_ads: {type: Boolean, default: false},
        points: {type: Number, default: 0, min: 0},
        lastpointusage: Date
    });

module.exports = UserSchema;