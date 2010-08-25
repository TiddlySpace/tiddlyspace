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

test("getHost", function() {
	var server_host, uri;

	server_host = {
		scheme: "https",
		host: "example.org",
		port: "8080"
	};
	uri = tiddlyspace.getHost(server_host);
	strictEqual(uri, "https://example.org:8080");

	server_host = {
		scheme: "http",
		host: "www.example.com",
		port: "80"
	};
	uri = tiddlyspace.getHost(server_host);
	strictEqual(uri, "http://www.example.com");

	server_host = {
		scheme: "http",
		host: "example.org",
		port: "8080"
	};
	uri = tiddlyspace.getHost(server_host, "foo");
	strictEqual(uri, "http://foo.example.org:8080");

	server_host = {
		scheme: "https",
		host: "www.example.com",
		port: "80"
	};
	uri = tiddlyspace.getHost(server_host, "foo");
	strictEqual(uri, "https://foo.www.example.com");
});

test("getAvatar", function() {
	var uri;
	var server_host = {
		scheme: "http",
		host: "example.org",
		port: "8080"
	};

	uri = tiddlyspace.getAvatar(server_host);
	strictEqual(uri, "http://example.org:8080/bags/tiddlyspace/tiddlers/SiteIcon");

	uri = tiddlyspace.getAvatar(server_host, null, true);
	strictEqual(uri, "http://foo.example.org:8080/bags/tiddlyspace/tiddlers/SiteIcon");

	// test for backwards compatibility -- XXX: deprecated
	uri = tiddlyspace.getAvatar(server_host, { name: "xxx" });
	strictEqual(uri, "http://xxx.example.org:8080/bags/xxx_public/tiddlers/SiteIcon");
	uri = tiddlyspace.getAvatar(server_host, { name: "xxx" }, true);
	strictEqual(uri, "http://foo.example.org:8080/bags/xxx_public/tiddlers/SiteIcon");

	uri = tiddlyspace.getAvatar(server_host, "fnd");
	strictEqual(uri, "http://fnd.example.org:8080/bags/fnd_public/tiddlers/SiteIcon");

	uri = tiddlyspace.getAvatar(server_host, "fnd", true);
	strictEqual(uri, "http://foo.example.org:8080/bags/fnd_public/tiddlers/SiteIcon");

	uri = tiddlyspace.getAvatar(server_host, "jon");
	strictEqual(uri, "http://jon.example.org:8080/bags/jon_public/tiddlers/SiteIcon");

	uri = tiddlyspace.getAvatar(server_host, "jon", true);
	strictEqual(uri, "http://foo.example.org:8080/bags/jon_public/tiddlers/SiteIcon");
});

})(QUnit.module);
