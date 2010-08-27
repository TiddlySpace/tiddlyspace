(function(module, $) {

var _ajax, _macro;

var nop = function() {};

module("TiddlySpaceSpaces plugin", {
	setup: function() {
		_macro = config.macros.TiddlySpaceSpaces;
		config.macros.TiddlySpaceSpaces.formTemplate = "<form />";
		_ajax = $.ajax;
		$.ajax = function(options) {
			options.success([
				{ name: "fnd", uri: "http://bar" },
				{ name: "jon", uri: "http://foo" }
			]);
		};
	},
	teardown: function() {
		$.ajax = _ajax;
		config.macros.TiddlySpaceSpaces = _macro;
	}
});

test("add space form", function() {
	var place = $("<div />");
	config.macros.TiddlySpaceSpaces.handler(place, null, ["add"]);
	strictEqual(place.find("form").length, 1);
});

test("list spaces", function() {
	var place = $("<div />");

	config.macros.TiddlySpaceSpaces.refresh(place, "list");
	strictEqual($("ul", place).length, 1);
	strictEqual($("li", place).length, 2);
	strictEqual($("a", place).length, 2);

	var firstLink = $("a:first", place);
	strictEqual(firstLink.text(), "fnd");
	strictEqual(firstLink.attr("href"), "http://bar");
});

})(QUnit.module, jQuery);
