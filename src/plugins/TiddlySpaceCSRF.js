(function() {
var getCSRFToken = function(window) {
	// XXX: should not use RegEx - cf.
	// http://www.quirksmode.org/js/cookies.html
	// https://github.com/TiddlySpace/tiddlyspace/commit/5f4adbe009ed4bda3ce39058a3fb07de1420358d
	var regex = /^(?:.*; )?csrf_token=([^(;|$)]*)(?:;|$)/;
	var match = regex.exec(document.cookie);
	var csrf_token = null;
	if (match && (match.length === 2)) {
		csrf_token = match[1];
	}

	return csrf_token;
};

if (typeof config !== 'undefined' && config.extensions &&
		config.extensions.tiddlyspace &&
		config.extensions.tiddlyspace.getCSRFToken === null) {
	config.extensions.tiddlyspace.getCSRFToken = getCSRFToken;
} else {
	window.getCSRFToken = getCSRFToken;
}
})(window);
