(function(module, $) {

module("ToggleTiddlerPrivacy plugin", {
	setup: function() {},
	teardown: function() {}
});

test("isExternal", function() {
	var isExternal;
	var macro = config.macros.setPrivacy;
	var tiddler = new Tiddler("z");
	tiddler.fields["server.bag"] = "foo_public";
	isExternal = macro.isExternal(tiddler);
	strictEqual(isExternal, false);

	tiddler.fields["server.bag"] = "jon_public";
	isExternal = macro.isExternal(tiddler);
	strictEqual(isExternal, true);

	tiddler.fields["server.bag"] = "anotherfoo_public";
	isExternal = macro.isExternal(tiddler);
	strictEqual(isExternal, true);

	tiddler.fields["server.bag"] = "tiddlyspace";
	isExternal = macro.isExternal(tiddler);
	strictEqual(isExternal, true);
});

})(QUnit.module, jQuery);
