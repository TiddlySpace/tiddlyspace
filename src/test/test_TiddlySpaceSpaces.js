(function(module, $) {

var _request, _response;
var _ajax = $.ajax;
var nop = function() {};

var _macro;
module("TiddlySpaceSpaces plugin", {
	setup: function() {
		_macro = config.macros.TiddlySpaceSpaces;
		config.macros.TiddlySpaceSpaces.formTemplate = "<form />";
		$.ajax = function(options) {
			options.success([{name: "fnd", uri: "http://bar"}, {name: "jon", uri: "http://foo"}]);
		};
	},
	teardown: function() {
		$.ajax = _ajax;
		config.macros.TiddlySpaceSpaces = _macro;
	}
});

test("add space form", function() {
	var place = $("<div />");
	config.macros.TiddlySpaceSpaces.refresh(place, "add");
	strictEqual($("form", place).length, 1);
});

test("list spaces", function() {
	var place = $("<div />");
	config.macros.TiddlySpaceSpaces.refresh(place, "list");
	console.log("p", place);
	strictEqual($("ul", place).length, 1);
	strictEqual($("li", place).length, 2);
	strictEqual($("a", place).length, 2);
	var firstLink = $("a", place)[0];
	strictEqual($(firstLink).text(), "fnd");
	strictEqual($(firstLink).attr("href"), "http://bar");
});

})(QUnit.module, jQuery);
