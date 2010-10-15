(function(module, $) {

var _getTaggedTiddlers, _getUserInfo, _binaryTiddlersPlugin, _ajaxReq, _twebadaptor;
var taggedTiddlers = [];
config.macros.tsScan.init();

module("TiddlySpaceFollowing", {
	setup: function() {
		taggedTiddlers = [];
		_ajaxReq = ajaxReq;
		ajaxReq = function(options) {
			options.success([{title: "@bob"}, {title: "jon"}, {title: "@fnd"}]);
		};
		_twebadaptor = config.adaptors.tiddlyweb;
		config.adaptors.tiddlyweb = {
			toTiddler: function(json) {
				return new Tiddler(json.title);
			}
		};
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
		ajaxReq = _ajaxReq;
		config.adaptors.tiddlyweb = _twebadaptor;
		taggedTiddlers = [];
		store.getTaggedTiddlers = _getTaggedTiddlers;
		config.extensions.tiddlyweb.getUserInfo = _getUserInfo;
		config.extensions.BinaryTiddlersPlugin = _binaryTiddlersPlugin;
	}
});

test("_getFollowerBags", function() {
	var followMacro = config.macros.followTiddlers;
	// where foo is the current space..
	var actual = [];
	actual.push(followMacro._getFollowerBags(["foo"]));
	actual.push(followMacro._getFollowerBags(["foo", "bar", "dum"]));
	actual.push(followMacro._getFollowerBags([]));
	same(actual[0].length, 0);
	same(actual[1].length, 2);
	same(actual[2].length, 0);
});

test("getFollowers", function() {
	var followMacro = config.macros.followTiddlers;
	var passedTest = false;
	var callback = function(list) {
		if(list.length == 3) {
			if(list.contains("jon") && list.contains("bob")) {
				passedTest = true;
			}
		}
	};
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
