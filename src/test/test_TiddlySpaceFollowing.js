(function(module, $) {

var _getTaggedTiddlers;
var taggedTiddlers = [];

module("TiddlySpaceFollowing", {
	setup: function() {
		taggedTiddlers = [];
		_getTaggedTiddlers = store.getTaggedTiddlers;
		store.getTaggedTiddlers = function() {
			return taggedTiddlers;
		};
	},
	teardown: function() {
		taggedTiddlers = [];
		store.getTaggedTiddlers = _getTaggedTiddlers;
	}
});

test("getFollowerSpaceName", function() {
	var followMacro = config.macros.followTiddlers;
	var r1 = followMacro.getFollowerSpaceName("@jon");
	var r2 = followMacro.getFollowerSpaceName("jon");
	var r3 = followMacro.getFollowerSpaceName("JoN");
	strictEqual(r1, "jon");
	strictEqual(r2, "jon");
	strictEqual(r3, "jon");
});

test("getOptions", function() {
	// setup
	var scanMacro = config.macros.tsScan;
	var paramString = {
		parseParams: function() {
			return [{ tag: ["foo", "bar"], searchField:["modifier"], modifier: ["bob"], 
				searchValues: ["jon", "fnd"], query: ["select=sort:modified"]
			}]
		}
	};
	var paramString2 = {
		parseParams: function() {
			return [{ tag: ["foo", "bar"], searchField:["title"], title: ["max"],
				searchValues: ["jon", "fnd"], query: ["select=sort:modified"]
			}]
		}
	};
	var paramString3 = {
		parseParams: function() {
			return [{ tag: ["foo", "bar"], searchField:["modifier"],
				searchValues: ["jon", "fnd"], query: ["select=sort:modified"]
			}]
		}
	};
	var paramString4 = {
		parseParams: function() {
			return [{ tag: ["foo", "bar"], searchField:["modifier"],
				name: ["SiteInfo"], query: ["select=sort:modified"]
			}]
		}
	};

	// run
	var options = scanMacro.getOptions(paramString, "http://%0.tiddlyspace.com");
	var options2 = scanMacro.getOptions(paramString2);
	var options3 = scanMacro.getOptions(paramString3);
	var options4 = scanMacro.getOptions(paramString4);

	// test
	strictEqual(options.spaceField, "bag");
	strictEqual(options.searchField, "modifier");
	strictEqual(options.tag, "foo");
	strictEqual(options.searchValues[0], "bob");
	strictEqual(options.fat, false);
	strictEqual(options.query, "select=sort:modified");
	strictEqual(options.host, "http://%0.tiddlyspace.com");
	strictEqual(options2.searchValues[0], "max");
	strictEqual(options3.searchValues.length, 2);
	strictEqual(options3.searchValues.indexOf("jon") > -1, true);
	strictEqual(options3.searchValues.indexOf("fnd") > -1, true);
	strictEqual(options4.searchValues[0], "SiteInfo");
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

})(QUnit.module, jQuery);
