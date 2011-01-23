(function(module, $) {
var _getUserInfo, _createSpaceLink, _resolveSpaceName;

var _mockCreateSpaceLink = function(container, space, title) {
	var link = $("<a />").appendTo(container)[0];
	if(space) {
		$(link).attr("space", space);
	}
	if(title) {
		$(link).attr("tiddler", title);
	}
	return link;
};

var _mockResolveSpaceName = function(x) {
	switch(x) {
		case "x_public":
			return "x"
			break;
		case "bar_public":
			return "bar"
			break;
		case "user_public":
			return "user"
			break
	}
	return false;
};

var runTest = function(container, bag, serverTitle) {
	var tiddler = new Tiddler("hello");
	if(serverTitle) {
		tiddler.fields["server.title"] = serverTitle;
	}
	tiddler.fields["server.bag"] = bag;
	paramString = {
		parseParams: function() {
			return [{}]
		}
	};
	config.macros.view.views.replyLink("hello", container, ["title", "replyLink"], null,
			paramString, tiddler);
};

module("TiddlySpaceViewTypes - user not logged in", {
	setup: function() {
		_resolveSpaceName = config.extensions.tiddlyspace.resolveSpaceName;
		config.extensions.tiddlyspace.resolveSpaceName = _mockResolveSpaceName;
		_createSpaceLink = createSpaceLink;
		createSpaceLink = _mockCreateSpaceLink;
		_getUserInfo = config.extensions.tiddlyweb.getUserInfo;
		config.extensions.tiddlyweb.getUserInfo = function(callback) {
			callback({ anon: true });
		};
	},
	teardown: function() {
		config.extensions.tiddlyspace.resolveSpaceName = _resolveSpaceName;
		createSpaceLink = _createSpaceLink;
		config.extensions.tiddlyweb.getUserInfo = _getUserInfo;
	}
});

test("reply link for tiddler for anon user", function() {
	var container = $("<div />")[0];
	runTest(container, "x_public");
	var link = $("a", container);
	strictEqual(link.length, 0, "no link should be created as the user is anon so has no homespace to reply in.");
});

module("TiddlySpaceViewTypes - in a users home space", {
	setup: function() {
		_resolveSpaceName = config.extensions.tiddlyspace.resolveSpaceName;
		config.extensions.tiddlyspace.resolveSpaceName = _mockResolveSpaceName;
		_createSpaceLink = createSpaceLink;
		createSpaceLink = _mockCreateSpaceLink;
		_getUserInfo = config.extensions.tiddlyweb.getUserInfo;
		config.extensions.tiddlyweb.getUserInfo = function(callback) {
			callback({ anon: false, name: "foo" });
		};
	},
	teardown: function() {
		config.extensions.tiddlyspace.resolveSpaceName = _resolveSpaceName;
		createSpaceLink = _createSpaceLink;
		config.extensions.tiddlyweb.getUserInfo = _getUserInfo;
	}
});

test("reply link on included tiddler", function() {
	var container = $("<div />")[0];
	runTest(container, "bar_public");
	var link = $("a", container);
	strictEqual(link.length, 0, "a reply link does not exist as in the users homespace.");
});

test("reply link for imported tiddler", function() {
	var container = $("<div />")[0];
	runTest(container, "bar_public", "non-mangled title");
	var link = $("a", container);
	strictEqual(link.length, 1, "a reply link should be created as it is imported");
	strictEqual(link.attr("tiddler"), "non-mangled title");
});

module("TiddlySpaceViewTypes - in a non-homespace", {
	setup: function() {
		_resolveSpaceName = config.extensions.tiddlyspace.resolveSpaceName;
		config.extensions.tiddlyspace.resolveSpaceName = _mockResolveSpaceName;
		_createSpaceLink = createSpaceLink;
		createSpaceLink = _mockCreateSpaceLink;
		_getUserInfo = config.extensions.tiddlyweb.getUserInfo;
		config.extensions.tiddlyweb.getUserInfo = function(callback) {
			callback({ anon: false, name: "user" });
		};
	},
	teardown: function() {
		config.extensions.tiddlyspace.resolveSpaceName = _resolveSpaceName;
		createSpaceLink = _createSpaceLink;
		config.extensions.tiddlyweb.getUserInfo = _getUserInfo;
	}
});

test("reply link on a tiddler in a non-homespace that did not originate from homespace", function() {
	var container = $("<div />")[0];
	runTest(container, "bar_public");
	var link = $("a", container);
	strictEqual(link.length, 1, "the bag is not the users bag so it is possible to reply.");
});

test("reply link on an imported tiddler in a non-homespace", function() {
	var container = $("<div />")[0];
	runTest(container, "bar_public", "imported");
	var link = $("a", container);
	strictEqual(link.length, 1, "the tiddler is imported so a reply link is added");
	strictEqual(link.attr("tiddler"), "imported", "make sure the real name is shown (the server.title)");
});

test("reply link on a tiddler in a non-homespace that originated from homespace", function() {
	var container = $("<div />")[0];
	runTest(container, "user_public");
	var link = $("a", container);
	strictEqual(link.length, 0, "link hidden.. the space 'foo' includes a tiddler from 'user'. " +
		"A user cannot reply to themselves.");
});

})(QUnit.module, jQuery);
