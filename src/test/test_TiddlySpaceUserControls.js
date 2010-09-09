(function(module, $) {

module("TiddlySpaceUserControls plugin");

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
