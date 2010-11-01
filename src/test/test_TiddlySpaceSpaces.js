(function(module, $) {

var _ajax, _macro;

module("TiddlySpaceSpaces plugin", {
	setup: function() {
		_macro = config.macros.TiddlySpaceSpaces;
		config.macros.TiddlySpaceSpaces.formTemplate = '<form><input type="checkbox" name="subscribe" /></form>';
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
var getParamString = function(anon, subscribe) {
	return {
		parseParams: function() {
			return [{ anon: anon, subscribe: subscribe }];
		}
	};
};

test("add space form", function() {
	var place = $("<div />");
	config.macros.TiddlySpaceSpaces.handler(place, null, ["add"], null, getParamString(["add"]));
	var form = place.find("form");
	var checkbox = $("input[name=subscribe]", form);
	strictEqual(form.length, 1);
	strictEqual(place.find("ul").length, 0);
	strictEqual(checkbox.length, 1);
	strictEqual(checkbox.attr("checked"), false);
});

test("add space form - subscribe checked", function() {
	var place = $("<div />");
	config.macros.TiddlySpaceSpaces.handler(place, null, ["add"], null,
		getParamString(["add"], ["yes"]));
	var form = place.find("form");
	var checkbox = $("input[name=subscribe]", form);
	strictEqual(form.length, 1);
	strictEqual(checkbox.attr("checked"), true);
});

test("list spaces", function() {
	var place = $("<div />");

	config.macros.TiddlySpaceSpaces.handler(place, null, [], null, getParamString([]));
	strictEqual(place.find("form").length, 0);
	strictEqual(place.find("ul").length, 1);

	config.macros.TiddlySpaceSpaces.refresh(place, "list");
	strictEqual($("ul", place).length, 1);
	strictEqual($("li", place).length, 2);
	strictEqual($("a", place).length, 2);

	var firstLink = $("a:first", place);
	strictEqual(firstLink.text(), "fnd");
	strictEqual(firstLink.attr("href"), "http://bar");
});

})(QUnit.module, jQuery);
