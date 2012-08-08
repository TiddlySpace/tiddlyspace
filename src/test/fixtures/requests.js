$.mockjax({
    url: '/bags/common/tiddlers/_reply-button.js',
    response: function() {
        this.responseText = 'function createReplyButton() {}';
    }
});