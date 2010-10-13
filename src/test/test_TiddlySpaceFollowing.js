(function(module, $) {

var _getTaggedTiddlers, _getUserInfo, _binaryTiddlersPlugin;
var taggedTiddlers = [];

module("TiddlySpaceFollowing", {
	setup: function() {
		taggedTiddlers = [];
		_getTaggedTiddlers = store.getTaggedTiddlers;
		store.getTaggedTiddlers = function() {
			return taggedTiddlers;
		};
		_getUserInfo = config.extensions.tiddlyweb.getUserInfo;
		config.extensions.tiddlyweb.getUserInfo = function(callback) {
			callback({ anon: true });
		};
		_binaryTiddlersPlugin = config.extensions.BinaryTiddlersPlugin;
		config.extensions.BinaryTiddlersPlugin = {
			endsWith: function(str, substr) {
				
			}
		};
	},
	teardown: function() {
		taggedTiddlers = [];
		store.getTaggedTiddlers = _getTaggedTiddlers;
		config.extensions.tiddlyweb.getUserInfo = _getUserInfo;
		config.extensions.BinaryTiddlersPlugin = _binaryTiddlersPlugin;
	}
});


test("_constructBagQuery", function() {
	var followMacro = config.macros.followTiddlers;
	// where foo is the current space..
	var actual = [];
	actual.push(followMacro._constructBagQuery(["foo"]));
	actual.push(followMacro._constructBagQuery(["foo", "bar", "dum"]));
	actual.push(followMacro._constructBagQuery([]));
	same(actual, [false, "(bag:bar_public%20OR%20bag:dum_public)", false]);
});

test("getFollowers (local version)", function() {
	var followMacro = config.macros.followTiddlers;
	var passedTest = false;
	var callback = function(list) {
		if(list.length == 3) {
			passedTest = true;
		}
	};
	var tiddler = new Tiddler("jon");
	tiddler.tags = [followMacro.followTag];
	taggedTiddlers.push(tiddler);
	tiddler = new Tiddler("bob");
	tiddler.tags = [followMacro.followTag];
	taggedTiddlers.push(tiddler);
	tiddler = new Tiddler("fnd");
	tiddler.tags = [followMacro.followTag];
	taggedTiddlers.push(tiddler);
	followMacro.getFollowers(callback, "foo"); // where foo is the current space
	strictEqual(passedTest, true);
});

test("getFollowers (user not logged in)", function() {
	var followMacro = config.macros.followTiddlers;
	var actual;
	var callback = function(list) {
		actual = list;
	};
	followMacro.getFollowers(callback);
	strictEqual(actual, false, "in cases where the user is anon false is returned");
});

test("tsScan.getOptions", function() {
	var paramString = {
		parseParams: function() {
			return [
				{
					name: ["SiteInfo"]
				}
			];
		}
	};
	var options = config.macros.tsScan.getOptions(paramString, "http://foo");
	strictEqual(options.searchValues[0], "SiteInfo");
});
})(QUnit.module, jQuery);
