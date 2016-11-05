let fs = require('fs');
let path = require('path');
let merge = require('merge-stream');
let gulp = require('gulp');
let concat = require('gulp-concat');
let sass = require('gulp-sass');
let handlebars = require('gulp-compile-handlebars');
let rename = require('gulp-rename');
let cleanCSS = require('gulp-clean-css');

let sourcePath = './src/';
let buildPath = './build/';
let pagesPath = './src/pages/';

//load main config
let mainConfig = require(sourcePath + 'main_config.json');

let getPages = function (dir) {
  return fs.readdirSync(dir)
    .filter(function (file) {
      return fs.statSync(path.join(dir, file)).isDirectory();
    });
};

gulp.task('compile', function () {
  let pages = getPages(pagesPath);
  pages.push('.');

  let handlebarsOptions = {
    batch: [sourcePath + 'partials'],
    helpers: {
      text: function (key) {
        return this.texts[key] || key;
      }
    }
  };

  let pagesTasks = pages.map(function (page) {
    let pageTexts = require(pagesPath + page + '/texts.json');
    let pageConfig = require(pagesPath + page + '/config.json');
    let languageCompilationTasks = [];

    //if page has multiple languages
    if (pageConfig.languages) {
      pageConfig.languages.forEach(function (pageLanguage) {
        let pageData = {
          currentLang: pageLanguage,
          currentAbsoluteUrl: `${mainConfig.domain}${page}/${pageLanguage}/`,
          texts: pageTexts[pageLanguage]
        };

        let gulpTask = gulp.src(pagesPath + page + '/*.hbs')
          .pipe(handlebars(pageData, handlebarsOptions))
          .pipe(rename('index.html'))
          .pipe(gulp.dest(buildPath + page + '/' + pageLanguage));

        languageCompilationTasks.push(gulpTask);
      });

      return languageCompilationTasks;
    } else {
      let pageData = {
        currentLang: 'en',
        currentAbsoluteUrl: (page === '.') ? mainConfig.domain: `${mainConfig.domain}${page}/`,//if root index no page
        texts: pageTexts
      };

      return (gulp.src(pagesPath + page + '/*.hbs')
        .pipe(handlebars(pageData, handlebarsOptions))
        .pipe(rename('index.html'))
        .pipe(gulp.dest(buildPath + page)));
    }
  });

  return merge(pagesTasks);
});

gulp.task('build-css', function () {
    return gulp.src([sourcePath + 'style/build.scss'])
    .pipe(sass())
    .pipe(cleanCSS())
    .pipe(concat('style.css'))
    .pipe(gulp.dest(buildPath + 'css'));
});

gulp.task('watch', ['compile', 'build-css'], function () {
  gulp.watch([sourcePath + '**/*.hbs', sourcePath + '**/*.json'], ['compile']);
  gulp.watch([sourcePath + '**/*.scss', sourcePath + '**/*.sass'], ['build-css']);
});
