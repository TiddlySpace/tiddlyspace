(function(module, $) {
module("TiddlySpaceFilters", {
	setup: function() {
		var tiddlers = ["elephant", "pig", "Ant"];
		var bag = "foo_private";
		for(var i = 0; i < tiddlers.length; i++) {
			var tiddler = new Tiddler(tiddlers[i]);
			tiddler.fields["server.bag"] = bag;
			store.saveTiddler(tiddler);
		}
		tiddlers = ["Bee", "zebra"];
		bag = "foo_public";
		for(var i = 0; i < tiddlers.length; i++) {
			var tiddler = new Tiddler(tiddlers[i]);
			tiddler.fields["server.bag"] = bag;
			store.saveTiddler(tiddler);
		}
		
	},
	teardown: function() {
		var tiddlers = ["Ant", "Bee", "elephant", "pig", "zebra"];
		for(var i = 0; i < tiddlers.length; i++) {
			store.removeTiddler(tiddlers[i]);
		}
	}
});

test("config.filters.is (public)", function() {
	var results = config.filters.is([], [null, null, null, "public"]);
	strictEqual(results.length, 2, "only 2 results are expected possibly another test is interfering.");
	strictEqual(results[0].title, "Bee");
	strictEqual(results[1].title, "zebra", "they should be sorted alphabetically by default");
});

test("config.filters.is (private)", function() {
	var results = config.filters.is([], [null, null, null, "private"]);
	strictEqual(results.length, 3, "only 3 results are expected possibly another test is interfering.");
	strictEqual(results[0].title, "Ant");
	strictEqual(results[1].title, "elephant");
	strictEqual(results[2].title, "pig");
});

test("config.filterHelpers.is.private", function() {
	var tiddler = new Tiddler("test");
	tiddler.fields["server.bag"] = "foo_private";
	var tiddler2 = new Tiddler("test");
	tiddler2.fields["server.bag"] = "x_private";
	var tiddler3 = new Tiddler("test");
	var ftest = config.filterHelpers.is["private"];
	var res1 = ftest(tiddler);
	var res2 = ftest(tiddler2);
	var res3 = ftest(tiddler3);
	strictEqual(config.extensions.tiddlyspace.currentSpace.name, "foo",
		"These tests rely on foo being the default space.")
	strictEqual(res1, true);
	strictEqual(res2, false);
	strictEqual(res3, false);
});

test("config.filterHelpers.is.public", function() {
	var tiddler = new Tiddler("test");
	tiddler.fields["server.bag"] = "foo_private";
	var tiddler2 = new Tiddler("test");
	tiddler2.fields["server.bag"] = "foo_public";
	var tiddler3 = new Tiddler("test");
	var ftest = config.filterHelpers.is["public"];
	var res1 = ftest(tiddler);
	var res2 = ftest(tiddler2);
	var res3 = ftest(tiddler3);
	strictEqual(res1, false);
	strictEqual(res2, true);
	strictEqual(res3, false);
});

test("config.filterHelpers.is.draft", function() {
	var tiddler = new Tiddler("test");
	tiddler.fields["server.bag"] = "foo_private";
	tiddler.fields["publish.name"] = "test2";
	var tiddler2 = new Tiddler("test");
	tiddler2.fields["server.bag"] = "foo_public";
	tiddler2.fields["publish.name"] = "test2";
	var tiddler3 = new Tiddler("test");
	var ftest = config.filterHelpers.is.draft;
	var res1 = ftest(tiddler);
	var res2 = ftest(tiddler2);
	var res3 = ftest(tiddler3);
	strictEqual(res1, true);
	strictEqual(res2, false, "the tiddler is public so not a draft");
	strictEqual(res3, false);
});

test("config.filterHelpers.is.local", function() {
	var tiddler = new Tiddler("test");
	tiddler.fields["server.bag"] = "foo_private";
	tiddler.fields["publish.name"] = "test2";
	var tiddler2 = new Tiddler("test");
	tiddler2.fields["server.bag"] = "foo_public";
	tiddler2.fields["publish.name"] = "test2";
	var tiddler3 = new Tiddler("test");
	var tiddler4 = new Tiddler("test");
	tiddler4.fields["server.bag"] = "xyz";
	var tiddler5 = new Tiddler("test");
	tiddler5.fields["server.bag"] = "xyz_private";
	var ftest = config.filterHelpers.is.local;
	var res1 = ftest(tiddler);
	var res2 = ftest(tiddler2);
	var res3 = ftest(tiddler3);
	var res4 = ftest(tiddler4);
	var res5 = ftest(tiddler5);
	strictEqual(res1, true);
	strictEqual(res2, true);
	strictEqual(res3, false, "no bag set.");
	strictEqual(res4, false,
		"xyz is not foo_private or foo_public so is alien (not local)");
	strictEqual(res5, false,
		"xyz_private is not foo_private or foo_public so is alien (not local)");
});

test("config.filterHelpers.is.unsynced", function() {
	var tiddler = new Tiddler("test");
	var tiddler2 = new Tiddler("test");
	tiddler2.fields.changecount = 0;
	var tiddler3 = new Tiddler("test");
	tiddler3.fields.changecount = 4;
	var ftest = config.filterHelpers.is.unsynced;
	var res1 = ftest(tiddler);
	var res2 = ftest(tiddler2);
	var res3 = ftest(tiddler3);
	strictEqual(res1, false);
	strictEqual(res2, false);
	strictEqual(res3, true);
});


})(QUnit.module, jQuery);
