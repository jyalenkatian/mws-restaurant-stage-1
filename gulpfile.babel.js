import gulp from 'gulp';
import responsive from 'gulp-responsive';
import del from 'del';
import runSequence from 'run-sequence';

// Create responsive images for jpg files
gulp.task('jpg-images-banners', function() {
  return gulp.src('images/**/*.jpg')
    .pipe(responsive({
      // Resize all jpg images to two different banner sizes: 500 and 800 with respective heights
      '**/*.jpg': [{
        width: 800,
        height: 200,
        quality: 70,
        rename: { suffix: '_2x'}
      }, {
        width: 500,
        height: 125,
        quality: 50,
        rename: { suffix: '_1x'}
      }]
    },))
    .pipe(gulp.dest('img/wide_banners'));
});

gulp.task('jpg-images-tiles', function() {
    return gulp.src('images/**/*.jpg')
      .pipe(responsive({
        // Resize all jpg images to two different tile sizes: 300 and 600
        '**/*.jpg': [{
          width: 600,
          quality: 70,
          rename: { suffix: '_2x'}
        }, {
          width: 300,
          quality: 50,
          rename: { suffix: '_1x'}
        }]
      },))
      .pipe(gulp.dest('img/tiles'));
  });

// Just copy any other images to img folder
gulp.task('other-images', function() {
  return gulp.src(['!images/**/*.jpg', 'images/**/*.*'])
    .pipe(gulp.dest('img/'));
});

// clean img folder
gulp.task('clean', function(done) {
  return del(['img/'], done);
});

// Run this task for your images.
gulp.task("images", function(done) {
  runSequence(
    'clean',
    ['jpg-images-banners','jpg-images-tiles','other-images'],
    done
  );
});