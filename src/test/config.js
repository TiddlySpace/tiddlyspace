(function() {

var ns = config.extensions.tiddlyspace;

module("config");

test("settings", function() {
	// XXX: relies on fixtures/tiddlyweb.js due to evaluation timing
	var toolbarCommands = config.shadowTiddlers.ToolbarCommands;

	strictEqual(toolbarCommands.length, 185);
	strictEqual(toolbarCommands.indexOf(" publishTiddlerRevision "), 60);

	strictEqual(ns.currentSpace, "foo");
});

test("determineSpace from container name", function() {
	var space;

	space = ns.determineSpace("foo");
	strictEqual(space, false);

	space = ns.determineSpace("foo_bar");
	strictEqual(space, false);

	space = ns.determineSpace("private");
	strictEqual(space, false);

	space = ns.determineSpace("public");
	strictEqual(space, false);

	space = ns.determineSpace("foo_private");
	strictEqual(space.name, "foo");
	strictEqual(space.type, "private");

	space = ns.determineSpace("bar_public");
	strictEqual(space.name, "bar");
	strictEqual(space.type, "public");

	space = ns.determineSpace("foo_bar_baz_public");
	strictEqual(space.name, "foo_bar_baz");
	strictEqual(space.type, "public");
});

test("determineSpace from tiddler object", function() {
	var space, tiddler;

	tiddler = { fields: {} };
	space = ns.determineSpace(tiddler);
	strictEqual(space, false);

	tiddler = { fields: {
		"server.bag": "alpha"
	}};
	space = ns.determineSpace(tiddler);
	strictEqual(space, false);

	tiddler = { fields: {
		"server.bag": "alpha_foo"
	}};
	space = ns.determineSpace(tiddler);
	strictEqual(space, false);
	tiddler = { fields: {
		"server.bag": "alpha_private"
	}};
	space = ns.determineSpace(tiddler);
	strictEqual(space.type, "private");
	strictEqual(space.name, "alpha");

	tiddler = { fields: {
		"server.bag": "alpha_foo_public"
	}};
	space = ns.determineSpace(tiddler);
	strictEqual(space.type, "public");
	strictEqual(space.name, "alpha_foo");

	tiddler = { fields: {
		"server.workspace": "bags/bravo_bar_public"
	}};
	space = ns.determineSpace(tiddler);
	strictEqual(space, false);

	tiddler = { fields: {
		"server.workspace": "bags/bravo_bar_public"
	}};
	space = ns.determineSpace(tiddler, true);
	strictEqual(space.type, "public");
	strictEqual(space.name, "bravo_bar");

	tiddler = { fields: {
		"server.workspace": "foo/bar_public"
	}};
	space = ns.determineSpace(tiddler, true);
	strictEqual(space, false);

	tiddler = { fields: {
		"server.bag": "alpha",
		"server.recipe": "bravo",
		"server.workspace": "charlie"
	}};
	space = ns.determineSpace(tiddler, true);
	strictEqual(space, false);

	tiddler = { fields: {
		"server.bag": "alpha_public",
		"server.recipe": "bravo_private",
		"server.workspace": "bags/charlie_public"
	}};
	space = ns.determineSpace(tiddler, true);
	strictEqual(space.type, "public");
	strictEqual(space.name, "alpha");
});

})();
