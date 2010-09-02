(function(module, $) {

module("ToggleTiddlerPrivacy plugin");

test("isExternal", function() {
	var macro = config.macros.setPrivacy;
	var tiddler = new Tiddler("z");

	tiddler.fields["server.bag"] = "foo_public";
	strictEqual(macro.isExternal(tiddler), false);

	tiddler.fields["server.bag"] = "jon_public";
	strictEqual(macro.isExternal(tiddler), true);

	tiddler.fields["server.bag"] = "anotherfoo_public";
	strictEqual(macro.isExternal(tiddler), true);

	tiddler.fields["server.bag"] = "tiddlyspace";
	strictEqual(macro.isExternal(tiddler), true);
});

})(QUnit.module, jQuery);
