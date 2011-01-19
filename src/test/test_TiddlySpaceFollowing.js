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
				str = str.replace("bags/", "");
				substr = substr.indexOf("_") === 0 ? substr.substr(1) : substr;
				if(str == "foo_public" && substr == "public") {
					return true;
				} else if(str == "foo_private" && substr == "private") {
					return true;
				} else if(str == "bob_public" && substr == "public") {
					return true;
				} else {
					return false;
				}
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

test("getLocalTitle", function() {
	var title1 = config.extensions.tiddlyspace.getLocalTitle("jon tiddler", "bags/foo_public");
	var title2 = config.extensions.tiddlyspace.getLocalTitle("jon tiddler", "bags/foo_private");
	var title3 = config.extensions.tiddlyspace.getLocalTitle("jon tiddler", "bags/bob_public");
	var title4 = config.extensions.tiddlyspace.getLocalTitle("jon tiddler", null, "edit conflict");
	strictEqual(title1, "jon tiddler *(public)*");
	strictEqual(title2, "jon tiddler *(private)*");
	strictEqual(title3, "jon tiddler *(@bob)*");
	strictEqual(title4, "jon tiddler *(edit conflict)*");
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
	strictEqual(options.searchField, "title");
	strictEqual(options.template, false);
	strictEqual(options.spaceField, "bag");
	strictEqual(options.fat, false);
	strictEqual(options.query, false);
	strictEqual(options.hideBags, false);
	strictEqual(options.showBags, false);
	strictEqual(options.filter, false);
	strictEqual(options.tag, false);
	strictEqual(options.sort, false);
});

test("tsScan.getOptions 2", function() {
	var paramString = {
		parseParams: function() {
			return [
				{
					name: ["SiteInfo"],
					searchField: ["bag"],
					spaceField: ["title"],
					bag: ["foo", "bar"],
					template: ["Foo"],
					fat: ["yes"],
					hide: ["jon_public", "ben_public"],
					show: ["fnd_public"],
					filter: ["[tag[foo]]"],
					query: ["select=tag:bar"],
					tag: ["follow"],
					sort: ["modified"]
				}
			];
		}
	};
	var options = config.macros.tsScan.getOptions(paramString, "http://foo");
	strictEqual(options.searchValues[0], "foo");
	strictEqual(options.searchValues[1], "bar");
	strictEqual(options.searchField, "bag");
	strictEqual(options.template, "Foo");
	strictEqual(options.spaceField, "title");
	strictEqual(options.fat, true);
	strictEqual(options.query, "select=tag:bar");
	strictEqual(options.hideBags.length, 2);
	strictEqual(options.hideBags.contains("jon_public"), true);
	strictEqual(options.showBags.length, 1);
	strictEqual(options.filter, "[tag[foo]]");
	strictEqual(options.tag, "follow");
	strictEqual(options.sort, "modified");
});

test("tsScan.constructSearchUrl", function() {
	var url = config.macros.tsScan.constructSearchUrl("", {
		searchField: "title",
		searchValues: ["hello", "test"],
		tag: "foo"
	});
	var url2 = config.macros.tsScan.constructSearchUrl("", {
		searchField: "tag",
		searchValues: ["hello"],
		fat: "y"
	});
	var url3 = config.macros.tsScan.constructSearchUrl("", {
		searchValues: ["@jon"],
		tag: "foo",
		query: "select=modified:>20101202000000"
	});
	var url4 = config.macros.tsScan.constructSearchUrl("", {
		searchField: "tag",
		searchValues: ["great"]
	});
	var url5 = config.macros.tsScan.constructSearchUrl("", {
		searchField: "tag",
		searchValues: ["great"],
		url: "/search?q=myquery"
	});

	strictEqual(url, '/search?q=(title:"hello" OR title:"test") AND tag:foo');
	strictEqual(url2, '/search?q=tag:"hello"&fat=y');
	strictEqual(url3, '/search?q=(title:"@jon") AND tag:foo;select=modified:>20101202000000;');
	strictEqual(url4, '/search?q=tag:"great"');
	strictEqual(url5, '/search?q=myquery');
});

})(QUnit.module, jQuery);
