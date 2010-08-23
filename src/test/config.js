(function(module) {

var tiddlyspace = config.extensions.tiddlyspace;

module("config");

test("settings", function() {
	// XXX: relies on fixtures/tiddlyweb.js due to evaluation timing
	strictEqual(tiddlyspace.currentSpace.type, "private");
	strictEqual(tiddlyspace.currentSpace.name, "foo");
});

test("determineSpace from container name", function() {
	var space;

	space = tiddlyspace.determineSpace("foo");
	strictEqual(space, false);

	space = tiddlyspace.determineSpace("foo_bar");
	strictEqual(space, false);

	space = tiddlyspace.determineSpace("private");
	strictEqual(space, false);

	space = tiddlyspace.determineSpace("public");
	strictEqual(space, false);

	space = tiddlyspace.determineSpace("foo_private");
	strictEqual(space.name, "foo");
	strictEqual(space.type, "private");

	space = tiddlyspace.determineSpace("bar_public");
	strictEqual(space.name, "bar");
	strictEqual(space.type, "public");

	space = tiddlyspace.determineSpace("foo_bar_baz_public");
	strictEqual(space.name, "foo_bar_baz");
	strictEqual(space.type, "public");
});

test("determineSpace from tiddler object", function() {
	var space, tiddler;

	tiddler = { fields: {} };
	space = tiddlyspace.determineSpace(tiddler);
	strictEqual(space, false);

	tiddler = { fields: {
		"server.bag": "alpha"
	}};
	space = tiddlyspace.determineSpace(tiddler);
	strictEqual(space, false);

	tiddler = { fields: {
		"server.bag": "alpha_foo"
	}};
	space = tiddlyspace.determineSpace(tiddler);
	strictEqual(space, false);
	tiddler = { fields: {
		"server.bag": "alpha_private"
	}};
	space = tiddlyspace.determineSpace(tiddler);
	strictEqual(space.type, "private");
	strictEqual(space.name, "alpha");

	tiddler = { fields: {
		"server.bag": "alpha_foo_public"
	}};
	space = tiddlyspace.determineSpace(tiddler);
	strictEqual(space.type, "public");
	strictEqual(space.name, "alpha_foo");

	tiddler = { fields: {
		"server.workspace": "bags/bravo_bar_public"
	}};
	space = tiddlyspace.determineSpace(tiddler);
	strictEqual(space, false);

	tiddler = { fields: {
		"server.workspace": "bags/bravo_bar_public"
	}};
	space = tiddlyspace.determineSpace(tiddler, true);
	strictEqual(space.type, "public");
	strictEqual(space.name, "bravo_bar");

	tiddler = { fields: {
		"server.workspace": "foo/bar_public"
	}};
	space = tiddlyspace.determineSpace(tiddler, true);
	strictEqual(space, false);

	tiddler = { fields: {
		"server.bag": "alpha",
		"server.recipe": "bravo",
		"server.workspace": "charlie"
	}};
	space = tiddlyspace.determineSpace(tiddler, true);
	strictEqual(space, false);

	tiddler = { fields: {
		"server.bag": "alpha_public",
		"server.recipe": "bravo_private",
		"server.workspace": "bags/charlie_public"
	}};
	space = tiddlyspace.determineSpace(tiddler, true);
	strictEqual(space.type, "public");
	strictEqual(space.name, "alpha");
});

})(QUnit.module);
