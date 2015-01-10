var gulp = require('gulp'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify'),
    minifyCSS = require('gulp-minify-css');


/**
 *  Front end files.
 *  NOTE: this could be less explicit. ex: `public/css/*.css`
 */
var frontend = {
  cssFiles: [
    './public/css/normalise.css',
    './public/css/forum.css'
  ],
  jsFiles: [
    './public/src/lib/async.js',
    './public/src/lib/moment.js',
    './public/src/lib/jquery-2.0.3.min.js',
    './public/src/lib/underscore-min.js',
    './public/js/autolinker.js',
    './public/js/pasteImageReader.js',
    './public/js/thread.js',
    './public/js/global.js',
    './public/js/messages.js'
  ]
};


/**
 *  Take all frontend.jsFiles , Uglify > concat > and save into main.min.js
 */
gulp.task('frontend:js', function() {
  gulp.src(frontend.jsFiles)
    .pipe(uglify())
    .pipe(concat('main.min.js'))
    .pipe(gulp.dest('./public/js'));
});


/**
 *  Take all frontend.cssFiles, minify > concat > and save into main.min.css
 */
gulp.task('frontend:css', function() {
  gulp.src(frontend.cssFiles)
    .pipe(minifyCSS())
    .pipe(concat('main.min.css'))
    .pipe(gulp.dest('./public/css'));
});


/**
 *  Watch files for changes and run task if files change
 */
gulp.task('watch', function() {
  gulp.watch(frontend.jsFiles, ['frontend:js']);
  gulp.watch(frontend.cssFiles, ['frontend:css']);
});


/**
 *  Run the default task
 */
gulp.task('default', ['watch', 'frontend:js', 'frontend:css']);
