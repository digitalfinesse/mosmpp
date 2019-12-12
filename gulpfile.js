'use strict';
const gulp   = require('gulp'),
      fs     = require("fs-extra"),
      glob   = require("glob"),
      path   = require("path"),
      sharp  = require("sharp");

const cp         = require("child_process");
const del        = require("del");
const sourcemaps = require('gulp-sourcemaps');

const rename = require('gulp-rename');
const concat = require('gulp-concat');

//img
const imagemin         = require('gulp-imagemin'),
      imageminJpegtran = require('imagemin-jpegtran'),
      imageminPngquant = require('imagemin-pngquant'),
      imageminZopfli   = require('imagemin-zopfli'),
      imageminMozjpeg  = require('imagemin-mozjpeg'), //need to run 'brew install libpng'
      imageminGiflossy = require('imagemin-giflossy'),
      imageminSvgo     = require('imagemin-svgo'),
      imageminWebp     = require('imagemin-webp');

//js
const uglify = require('gulp-uglify'),
      babel  = require('gulp-babel'),
      eslint = require("gulp-eslint");

//html
const htmlmin       = require('gulp-htmlmin'),
      htmlclean     = require('gulp-htmlclean');

//pug
//const pug = require('pug');
const pug = require('gulp-pug');

//css
//const autoprefixer     = require('autoprefixer');
const autoprefixer     = require('gulp-autoprefixer'),
      postcss          = require("gulp-postcss"),
      sass             = require("gulp-sass"),
      cssnano          = require("cssnano"),
      gcmq             = require('gulp-group-css-media-queries'),
      csso             = require('gulp-csso'),
      stripCssComments = require('gulp-strip-css-comments'),
      purge            = require('gulp-css-purge'),
      cleanCSS         = require('gulp-clean-css');

//error info
const plumber         = require('gulp-plumber'),
      debug           = require('gulp-debug'),
      size            = require('gulp-size'),
      errorHandler    = require('gulp-error-handle'),
      convertEncoding = require('gulp-convert-encoding');

// ... other includes
const browsersync   = require("browser-sync").create(),
      livereload    = require('gulp-livereload'),
      webpack       = require("webpack"),
      webpackconfig = require("./webpack.config.js"),
      webpackstream = require("webpack-stream");


// ...
// Put this after including our dependencies
const nameSource  = "./source";
const nameDist  = "./dist";

const paths = {
    html: {
        src: "./source/tpm/*.pug",
        dest: nameDist + "",
    },
    styles: {
        src: nameSource + "/scss/**/*.scss",
        dest: nameDist + "/css",
        maps: "./maps"
    },
    js: {
        src: nameSource + "/js/**/*.js",
        dest: nameDist + "/js",
        maps: "./maps"
    },
    img: {
        src: "source/img/**/*.{jpg,JPG,jpeg,JPEG,png,gif}",
        dest: nameDist + "/img"
    },
    imgSVG: {
        src: "source/img/**/*.svg",
        dest: nameDist + "/img"
    }
};
// �������������� �����������
const transforms = [
    {
        src: paths.img.src,
        dist: paths.img.dest,
        options: {
            width: 1920,
            //fit: 'inside',
            withoutEnlargement: true,
        }
    },
    {
        src: paths.img.src,
        dist: paths.img.dest,
        options: {
            width: 480,
            fit: 'inside',
            withoutEnlargement: true,
        }
    },
    {
        src: paths.img.src,
        dist: paths.img.dest,
        options: {
            width: 120,
            fit: 'inside',
            withoutEnlargement: true,
        }
    }
];

// ������ �����
function clean() {
    return del(["./dist/"]);
}


function style() {
    return gulp
    //.src(paths.styles.src)
        .src(nameSource + "/scss/style.scss")
        //.pipe(errorHandler())
        //.pipe(convertEncoding({to: 'utf8'}))
        .pipe(plumber())
        .pipe(debug({title: 'unicorn:'}))
        .pipe(sass({outputStyle: "expanded"}))
        .pipe(stripCssComments({
            preserve: false
        }))
        //.pipe(postcss([autoprefixer(), cssnano()]))
        .pipe(autoprefixer({
            cascade: false
        }))
        .pipe(gcmq())
        .pipe(purge({
            trim: true,
            shorten: true,
            verbose: true
        }))
        // .pipe(csso({
        //     // restructure: false,
        //     // sourceMap: false,
        //     // debug: true
        // }))
        //.pipe(sourcemaps.init())
        .pipe(cleanCSS({level: 1}))
        .pipe(rename({suffix: '.min'}))
        //.pipe(sourcemaps.write(paths.styles.maps))
        //.pipe(convertEncoding({to: '1251'}))
        .pipe(gulp.dest(paths.styles.dest))
        // Add browsersync stream pipe after compilation
        .pipe(browsersync.stream())
        .pipe(livereload());
}
function imgSVG() {
    return gulp.src(paths.imgSVG.src)
            .pipe(debug({title: 'building img:', showFiles: true}))
            .pipe(imagemin([
                //png
                //imageminPngquant({
                //    speed: 1,
                //    quality: [0.8, 0.9] //lossy settings
                //}),
                //imageminZopfli({
                //    more: true
                //    // iterations: 50 // very slow but more effective
                //}),
                ////gif
                // imagemin.gifsicle({
                //     interlaced: true,
                // }),
                //gif very light lossy, use only one of gifsicle or Giflossy
                //imageminGiflossy({
                //    optimizationLevel: 3,
                //    optimize: 3, //keep-empty: Preserve empty transparent frames
                //    lossy: 2
                //}),
                //svg
                imageminSvgo({
                    plugins: [{
                        optimizationLevel: 3,
                        interlaced: true,
                        removeViewBox: false,
                        removeUselessStrokeAndFill: false,
                        removeMetadata: true,
                        removeTitle: true,
                        cleanupIDs: false,
                        collapseGroups: true
                    }]
                }),
                //jpg lossless
                //imageminJpegtran({
                //    progressive: true
                //}),
                //jpg very light lossy, use vs jpegtran
                //imageminMozjpeg({
                //    quality: 90
                //}),
            ]))
            .pipe(gulp.dest(paths.imgSVG.dest))
            .pipe(size())
            .pipe(plumber())
            .pipe(debug({title: 'unicorn:'}))
}
// �������� ������ �����������
function resizeImages(done) {
    // ���� ����� ������ ������������ ��������
    transforms.forEach(function(transform) {

        // �������� ��� �����������
        let files = glob.sync(transform.src);

        // ��� ������� �����, ��������� �������������� � ��������� � ����.
        files.forEach(function (file) {
            let filename = path.basename(file),
                dirname  = path.dirname(file).replace(/^source/, 'dist');
            fs.ensureDir(dirname).then(() => {
                sharp(file)
                    .resize(transform.options)
                    .toBuffer((err, data, info) => {
                        if (transform.options.width == info.width) {
                            // jpg|JPG|jpeg|JPEG|png|gif
                            sharp(data)
                                .toFile(`${dirname}/${filename}`.replace(/\.(jpg|JPG|jpeg|JPEG|png|gif)$/, '-' + transform.options.width + 'w.$1'));
                            //webp
                            sharp(data)
                                .toFormat('webp')
                                .toFile(`${dirname}/${filename}`.replace(/\.(jpg|JPG|jpeg|JPEG|png|gif)$/, '-' + transform.options.width + 'w.webp'));
                        } else {
                            // jpg|JPG|jpeg|JPEG|png|gif
                            sharp(data)
                                .toFile(`${dirname}/${filename}`.replace(/\.(jpg|JPG|jpeg|JPEG|png|gif)$/, '-original.$1'));
                            //webp
                            sharp(data)
                                .toFormat('webp')
                                .toFile(`${dirname}/${filename}`.replace(/\.(jpg|JPG|jpeg|JPEG|png|gif)$/, '-original.webp'));
                        }
                    })
            });
        });
    });
    done();
}
//function js() {
//    return (
//        gulp
//            .src(paths.js.src)
//            //.pipe(convertEncoding({to: 'utf8'}))
//            .pipe(size())
//            .pipe(plumber())
//            .pipe(debug({title: 'unicorn:'}))
//            .pipe(babel())
//            .pipe(uglify())
//            .pipe(rename({suffix: '.min'}))
//            //.pipe(convertEncoding({to: '1251'}))
//            .pipe(gulp.dest(paths.js.dest))
//            // Add browsersync stream pipe after compilation
//            .pipe(browsersync.stream())
//    );
//}
function scripts() {
    return gulp
            .src(paths.js.src)
            //.pipe(convertEncoding({to: 'utf8'}))
            .pipe(size())
            .pipe(plumber())
            .pipe(debug({title: 'unicorn:'}))
            .pipe(babel())
            .pipe(uglify())
            .pipe(rename({suffix: '.min'}))
            //.pipe(convertEncoding({to: '1251'}))
            //.pipe(webpackstream(webpackconfig, webpack))
            .pipe(gulp.dest(paths.js.dest))
            .pipe(plumber())
            // Add browsersync stream pipe after compilation
            .pipe(browsersync.stream())
}
// Lint scripts
function scriptsLint() {
    return gulp
        .src(paths.js.src)
        .pipe(plumber())
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError());
}
//
function html() {
    return gulp.src(paths.html.src)
        .pipe(pug({
            pretty: true
        }))
        .pipe(htmlmin({
            collapseWhitespace: false,
            preserveLineBreaks: false,
            quoteCharacter: '"',
            removeComments: true,
            removeTagWhitespace: true,
            sortClassName: true,
            decodeEntities: true,
        }))
        //    ���������� html �� ������
        //.pipe(htmlclean({
        //    protect: /<\!--%fooTemplate\b.*?%-->/g,
        //    edit: function(html) { return html.replace(/\begg(s?)\b/ig, 'omelet$1'); }
        //}))
        .pipe(gulp.dest(paths.html.dest))
        .pipe(browsersync.stream());
}
// BrowserSync
function browserSync(done) {
    browsersync.init({
        //proxy: "http://printbar/",
        server: {
            baseDir: nameDist
        },
        port: 3000
    });
    done();
}
// BrowserSync Reload
function browserSyncReload(done) {
    browsersync.reload();
    done();
}
// Watch files
function watchFiles() {
    gulp.watch(nameSource + "/scss/**/*.scss", style);
    gulp.watch(nameSource + "/js/**/*.js" , scripts);
    gulp.watch(nameSource + "/fonts/**/*.*", font);
    gulp.watch(nameSource + "/tpm/**/*.pug", html);
    gulp.watch([
        "./source/**/*"
    ],
        gulp.series(browserSyncReload)
    );
    gulp.watch("source/img/**/*.{jpg,JPG,jpeg,JPEG,png,gif}", resizeImages);
    gulp.watch("source/img/**/*.svg", imgSVG);
}
function watchCSS() {
    livereload.listen({start: true});
    gulp.watch(nameSource + "/scss/**/*.scss", style);
}
// define complex tasks
const js    = gulp.series(scriptsLint, scripts);
const build = gulp.series(clean, gulp.parallel(style, resizeImages, js, html, font));
const watch = gulp.parallel(watchFiles, browserSync);

function font() {
    return gulp
        .src('source/fonts/**/*.*')
        .pipe(gulp.dest('dist/fonts'));
}
// exports (Common JS)
module.exports = {
    style: style,
    scripts: scripts,
    js: js,
    //img: img,
    imgSVG: imgSVG,
    resize: resizeImages,
    clean: clean,
    html: html,
    watchCSS: watchCSS,
    watch: watch,
    default: build,
    font: font,
};

//https://gist.github.com/jeromecoupe/0b807b0c1050647eb340360902c3203a
//https://github.com/jeromecoupe/webstoemp/blob/master/package.json
//https://www.webstoemp.com/blog/blazing-fast-image-transforms-with-sharp-gulp/
//https://www.webstoemp.com/blog/switching-to-gulp4/
//https://habr.com/ru/post/447560/
//https://habr.com/ru/post/440950/