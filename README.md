TeslaYay
========

Tesla Yayhooray app, runs on top of TeslaAPI https://github.com/cham/TeslaAPI


## Requirements

* [Node.JS](http://nodejs.org/)
* [Redis](http://redis.io/)
* [TeslaAPI](https://github.com/cham/TeslaAPI)
* [Xcode Command Line Tools - Mac only](https://developer.apple.com/xcode/)

## Getting started
1. clone the repo
2. start redis
3. start TeslaAPI
4. cd into repository directory
5. run `npm install`
6. run `node app.js`

Yay is now running on port 3000.


## Editing Javascript / Stylesheets
Javascript and stylesheets are concatenated and minified from `gulpfile.js`.

To watch the files for changes, and recompile when changed run `gulp`:

    $ gulp
    # Output
    [08:24:52] Using gulpfile ~/projects/TeslaYay/gulpfile.js
    [08:24:52] Starting 'watch'...
    [08:24:52] Finished 'watch' after 11 ms
    [08:24:52] Starting 'frontend:js'...
    [08:24:52] Finished 'frontend:js' after 10 ms
    [08:24:52] Starting 'frontend:css'...
    [08:24:52] Finished 'frontend:css' after 2.04 ms
    [08:24:52] Starting 'default'...
    [08:24:52] Finished 'default' after 5.65 μs

If you are not watching the files, and would like to update the JS only:

    $ gulp front:js
    # Output
    [08:26:54] Using gulpfile ~/projects/TeslaYay/gulpfile.js
    [08:26:54] Starting 'frontend:js'...
    [08:26:54] Finished 'frontend:js' after 7.77 ms
