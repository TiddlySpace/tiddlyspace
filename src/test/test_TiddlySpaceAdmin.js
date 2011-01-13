(function(module, $) {

var form, container, macro, _getCSRFToken, _ajaxReq, _ajaxSuccess, _ajaxMode;
module("TiddlySpaceForms plugin", {
	setup: function() {
		_ajaxSuccess = false;
		_ajaxReq = ajaxReq;
		ajaxReq = function(options) {
			if(_ajaxMode == 1 && options.url == "/challenge/cookie_form") {
				_ajaxSuccess = true;
			} else if(_ajaxMode == 2 && options.url == "/challenge/custom") {
				_ajaxSuccess = true;
			}
		};
		container = $("<div />").appendTo(document.body)[0];
		macro = config.macros.TiddlySpaceAdmin;
		form = $("<form />").appendTo(document.body)[0];
		_getCSRFToken = config.extensions.tiddlyspace.getCSRFToken;
		config.extensions.tiddlyspace.getCSRFToken = function() {
			return "blaglag"
		};
	},
	teardown: function() {
		_ajaxMode = null;
		_ajaxSuccess = true;
		ajaxReq = _ajaxReq;
		$(form).remove();
		$(container).remove();
		macro = null;
		config.extensions.tiddlyspace.getCSRFToken = _getCSRFToken;
	}
});

test("elements helpers: openid", function() {
	var el = macro.elements.openid();
	strictEqual(el.name, "openid");
});

test("elements helpers: password", function() {
	var el = macro.elements.password();
	var el2 = macro.elements.password(true);
	strictEqual(el.name, "password");
	strictEqual(el.type, "password");
	strictEqual(el2.name, "password_confirm");
	strictEqual(el2.type, "password");
});

test("elements helpers: username", function() {
	var el = macro.elements.username();
	strictEqual(el.name, "username");
});

test("elements helpers: redirect", function() {
	var el = macro.elements.redirect();
	strictEqual(el.name, "tiddlyweb_redirect");
	strictEqual(el.type, "hidden");
	strictEqual(el.value, "/");
});

test("printLoggedInMessage", function() {
	var macro = config.macros.TiddlySpaceLogin;
	var place = $("<div />")[0];
	macro.printLoggedInMessage(place, "bob");

	var link = $("a", place);
	strictEqual(link.length, 1);
	strictEqual(link.attr("href"), "http://bob.tiddlyspace.com");
});

test("printLoggedInMessage custom message", function() {
	var macro = config.macros.TiddlySpaceLogin;
	var place = $("<div />")[0];
	macro.printLoggedInMessage(place, "bob", { message: "hello %0 you sexy thing" });

	var link = $("a", place);
	strictEqual(link.length, 1);
	strictEqual(link.attr("href"), "http://bob.tiddlyspace.com");
	strictEqual($(place).text(), "hello bob you sexy thing");
});

test("login (default)", function() {
	var tsl = config.macros.TiddlySpaceLogin;
	var NOP = function() {};
	_ajaxMode = 1;
	tsl.login("k", "k", NOP, NOP);
	strictEqual(_ajaxSuccess, true, "the ajax request was made as expected to default challenger");
});

test("login (custom)", function() {
	var tsl = config.macros.TiddlySpaceLogin;
	var NOP = function() {};
	_ajaxMode = 2;
	tsl.login("k", "k", NOP, NOP, "custom");
	strictEqual(_ajaxSuccess, true, "the ajax request was made as expected to a custom challenger");
});

})(QUnit.module, jQuery);
