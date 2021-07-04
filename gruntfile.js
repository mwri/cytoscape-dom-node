module.exports = function(grunt) {
    require('load-grunt-tasks')(grunt);

    grunt.initConfig({
        gitstatus: {
            publish: {
                options: {
                    callback: function (r) {
                        if (r.length > 0)
                            throw new Error('git status unclean');
                    },
                },
            },
        },
    });

    grunt.registerTask('prepublish', [
        'gitstatus:publish',
    ]);
};
