var gulp = require('gulp');
var uglify = require('gulp-uglify');
var browserify = require('gulp-browserify');
var rename = require('gulp-rename');
var gzip = require('gulp-gzip');

// creates a non-minified, browser-ready version of citation.js
gulp.task('browser', function () {
  return gulp.src('citation.js')
    .pipe(browserify({debug: true}))
    .pipe(rename('citation.js'))
    .pipe(gulp.dest('browser'));
});

// creates a minified, browser-ready version of citation.js
gulp.task('browser-minified', function () {
  return gulp.src('citation.js')
    .pipe(browserify({debug: false}))
    .pipe(uglify())
    .pipe(rename('citation.min.js'))
    .pipe(gulp.dest('browser'));
});

// creates a minified and gzipped, browser-ready version of citation.js
gulp.task('browser-gzip', function () {
  return gulp.src('citation.js')
    .pipe(browserify({debug: false}))
    .pipe(uglify())
    .pipe(gzip())
    .pipe(rename('citation.min.js.gz'))
    .pipe(gulp.dest('browser'));
});

gulp.task('default', ['browser', 'browser-minified', 'browser-gzip']);
