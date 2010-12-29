(function(module, $) {
var _getUserInfo, _createSpaceLink, _resolveSpaceName;

var _mockCreateSpaceLink = function(container) {
	$("<a />").appendTo(container);
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

var runTest = function(container, bag) {
	var tiddler = new Tiddler("hello");
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

test("reply link on included/sucked in tiddler", function() {
	var container = $("<div />")[0];
	runTest(container, "bar_public");
	var link = $("a", container);
	strictEqual(link.length, 0, "a reply link does not exist as in the users homespace.");
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

test("reply link on a tiddler in a non-homespace that originated from homespace", function() {
	var container = $("<div />")[0];
	runTest(container, "user_public");
	var link = $("a", container);
	strictEqual(link.length, 0, "link hidden.. the space 'foo' includes a tiddler from 'user'. " +
		"A user cannot reply to themselves.");
});

})(QUnit.module, jQuery);
