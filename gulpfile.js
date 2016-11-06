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

gulp.task('compile', function () {
  //load main config
  let mainConfig = require(sourcePath + 'main_config.json');

  let pages = fs.readdirSync(pagesPath)
    .filter(function (file) {
      return fs.statSync(path.join(pagesPath, file)).isDirectory();
    });
  //add index page
  pages.push('.');

  let handlebarsOptions = {
    batch: [sourcePath + 'partials'],
    helpers: {
      text: function (key) {
        return this.texts[key] || key;
      }
    }
  };

  let sitemapData = {
    sitemapMultiLanguagesUrls: [],
    sitemapUrls: []
  };

  let pagesTasks = pages.map(function (page) {
    let pageTexts = require(pagesPath + page + '/texts.json');
    let pageConfig = require(pagesPath + page + '/config.json');
    let languageCompilationTasks = [];

    //if page has multiple languages
    if (pageConfig.languages) {
      let multiLanguagesUrls = [];

      pageConfig.languages.forEach(function (pageLanguage) {
        //add url to sitemapData
        multiLanguagesUrls.push({lang: pageLanguage, url: `${mainConfig.domain}${page}/${pageLanguage}/`, isMainLang: pageLanguage === 'en'});

        //build alternate languages urls array (for link rel=alternate)
        let linkAlternate = pageConfig.languages.map(function (language) {
          if (language !== pageLanguage) {
            return {lang: language, url: `${mainConfig.domain}${page}/${language}/`};
          }
        });

        let pageData = {
          currentLang: pageLanguage,
          linkAlternate,
          currentAbsoluteUrl: `${mainConfig.domain}${page}/${pageLanguage}/`,
          texts: pageTexts[pageLanguage]
        };

        let gulpTask = gulp.src(pagesPath + page + '/*.hbs')
          .pipe(handlebars(pageData, handlebarsOptions))
          .pipe(rename('index.html'))
          .pipe(gulp.dest(buildPath + page + '/' + pageLanguage));

        languageCompilationTasks.push(gulpTask);
      });

      //add page urls language array
      sitemapData.sitemapMultiLanguagesUrls.push({multiLanguagesUrls});

      return languageCompilationTasks;
    } else {
      //create page url, if root index no page name
      let pageUrl = (page === '.') ? mainConfig.domain : `${mainConfig.domain}${page}/`;

      //add url to sitemapData
      sitemapData.sitemapUrls.push({url: pageUrl});

      let pageData = {
        currentLang: 'en',
        currentAbsoluteUrl: pageUrl,
        texts: pageTexts
      };

      return (gulp.src(pagesPath + page + '/*.hbs')
        .pipe(handlebars(pageData, handlebarsOptions))
        .pipe(rename('index.html'))
        .pipe(gulp.dest(buildPath + page)));
    }
  });

  //create sitemap build task
  let sitemapTask = (gulp.src(`${sourcePath}partials/sitemap.hbs`)
    .pipe(handlebars(sitemapData, handlebarsOptions))
    .pipe(rename('sitemap.xml'))
    .pipe(gulp.dest(buildPath)));

  return merge(pagesTasks, sitemapTask);
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
