(function(module, $) {
module("TiddlySpaceFilters", {
	setup: function() {
	},
	teardown: function() {
	}
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


})(QUnit.module, jQuery);
