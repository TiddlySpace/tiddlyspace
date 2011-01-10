(function(module, $) {

var form, container, macro, _getCSRFToken;
module("TiddlySpaceForms plugin", {
	setup: function() {
		container = $("<div />").appendTo(document.body)[0];
		macro = config.macros.TiddlySpaceAdmin;
		form = $("<form />").appendTo(document.body)[0];
		_getCSRFToken = config.extensions.tiddlyspace.getCSRFToken;
		config.extensions.tiddlyspace.getCSRFToken = function() {
			return "blaglag"
		};
	},
	teardown: function() {
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

})(QUnit.module, jQuery);
