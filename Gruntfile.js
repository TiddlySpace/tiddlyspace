module.exports = function(grunt) {
    var sauceUser = "tiddlyspace";
    var sauceKey = null;
    if (typeof process.env.SAUCE_USERNAME !== "undefined") {
        sauceUser = process.env.SAUCE_USERNAME;
    }
    if (typeof process.env.SAUCE_ACCESS_KEY !== "undefined") {
        sauceKey = process.env.SAUCE_ACCESS_KEY;
    }
    var browsers = [{
        browserName: "internet explorer",
        version: "10",
        platform: "Windows 8"
    }, {
        browserName: "internet explorer",
        version: "9",
        platform: "Windows 7"
    }, {
    }, {
        browserName: "internet explorer",
        version: "8",
        platform: "Windows 7"
    }, {
    }, {
        browserName: "internet explorer",
        version: "7",
        platform: "Windows XP"
    }, {
        browserName: "chrome",
        platform: "Linux"
    }, {
        browserName: "firefox",
        platform: "Linux",
        version: "21"
    }, {
        browserName: "safari",
        platform: "OS X 10.8",
        version: "6"
    }, {
        browserName: "opera",
        version: "12",
        platform: "Linux"
    }];

    grunt.initConfig({
        connect: {
            server: {
                options: {
                    base: "src",
                    port: 9999
                }
            }
        },
        'saucelabs-qunit': {
            all: {
                options: {
                    username: sauceUser,
                    key: sauceKey,
                    urls: ["http://127.0.0.1:9999/test/index.html"],
                    tunnelTimeout: 5,
                    build: process.env.TRAVIS_JOB_ID,
                    concurrency: 3,
                    browsers: browsers,
                    detailedError: true,
                    testname: "TiddlySpace QUnit Tests",
                    tags: ["master"]
                }
            }
        },
        watch: {}
    });

    // Loading dependencies
    for (var key in grunt.file.readJSON("package.json").devDependencies) {
        if (key !== "grunt" && key.indexOf("grunt") === 0) grunt.loadNpmTasks(key);
    }

    grunt.registerTask("dev", ["connect", "watch"]);
    grunt.registerTask("test", ["connect", "saucelabs-qunit"]);
};