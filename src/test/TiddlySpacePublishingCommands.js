(function(module, $) {

var _copy;
module("TiddlySpacePublishingCommands", {
	setup: function() {
		_copy = config.commands.publishTiddler.copyTiddler;
	},
	teardown: function() {
		store.removeTiddler("pig");
		config.commands.publishTiddler.copyTiddler = _copy;
	}
});

test("toggleWorkspace", function() {
	var cmd = config.commands.publishTiddler;
	var actual = [];
	// run
	actual.push(cmd.toggleWorkspace("bags/jon_public"));
	actual.push(cmd.toggleWorkspace("recipes/xyz-boo_private"));
	actual.push(cmd.toggleWorkspace("recipes/jon_public"));
	actual.push(cmd.toggleWorkspace("recipes/jon_public", "private"));
	actual.push(cmd.toggleWorkspace("bags/jon_public", "public"));
	same(["bags/jon_private", "recipes/xyz-boo_public",
		"recipes/jon_private", "recipes/jon_private", "bags/jon_public"], actual);
});

test("toggleWorkspace (with tiddler)", function() {
	var cmd = config.commands.publishTiddler;
	var actual = [];
	var tiddler = new Tiddler("foo");
	tiddler.fields["server.workspace"] = "recipes/hello_private";
	actual.push(cmd.toggleWorkspace(tiddler));
	tiddler.fields["server.workspace"] = "bags/jon_private";
	actual.push(cmd.toggleWorkspace(tiddler));
	tiddler.fields["server.bag"] = "hello_public";
	actual.push(cmd.toggleWorkspace(tiddler));
	actual.push(cmd.toggleWorkspace(tiddler, "private"));
	tiddler.fields["server.bag"] = "hello_public";
	actual.push(cmd.toggleWorkspace(tiddler, "public"));
	same(["recipes/hello_public", "bags/jon_public", "bags/hello_private",
		"bags/hello_private", "bags/hello_public"], actual);
});

test("toggleBag", function() {
	var cmd = config.commands.publishTiddler;
	var actual = [];
	// run
	var tiddler = new Tiddler("foo");
	tiddler.fields["server.bag"] = "bob_private";
	actual.push(cmd.toggleBag("jon_public"));
	actual.push(cmd.toggleBag("jon_public", "public"));
	actual.push(cmd.toggleBag(tiddler, "private"));
	actual.push(cmd.toggleBag(tiddler));
	same(["jon_private", "jon_public", "bob_private", "bob_public"], actual);
});



test("deleteResource (where bag is different from tiddler)", function() {
	var cmd = config.commands.deleteTiddler;
	var tiddler = new Tiddler("foo");
	tiddler.fields["server.workspace"] = "bags/jon_private";
	tiddler.fields["server.etag"] = "etag/";
	var expectedPath;
	tiddler.getAdaptor = function() {
		var adaptor = {
			deleteTiddler: function(tiddler, context, userParams, callback) {
				if(tiddler.fields["server.workspace"] == "bags/jon_public"
					&& !tiddler.fields["server.etag"]) {
						expectedPath = true;
					}
					callback({status: true});
			}
		};
		return adaptor;
	}

	// run
	cmd.deleteResource(tiddler, "jon_public");
	strictEqual(expectedPath, true);
});

test("deleteResource private tiddler", function() {
	var cmd = config.commands.deleteTiddler;
	var tiddler = new Tiddler("foo");
	tiddler.fields["server.bag"] = "foo_public";
	tiddler.fields["server.workspace"] = "bags/jon_public";
	tiddler.fields["server.etag"] = "etag/";
	store.saveTiddler(tiddler);
	var expectedPath;
	tiddler.getAdaptor = function() {
		var adaptor = {
			deleteTiddler: function(tiddler, context, userParams, callback) {
				if(tiddler.fields["server.bag"] == "jon_private"
					&& tiddler.fields["server.workspace"] == "bags/jon_private"
					&& !tiddler.fields["server.etag"]) {
						expectedPath = true;
					}
					callback({status: true});
			}
		};
		return adaptor;
	}
	strictEqual(store.tiddlerExists("foo"), true);

	// run
	cmd.deleteResource(tiddler, "jon_private");
	strictEqual(expectedPath, true);
	strictEqual(store.tiddlerExists("foo"), true); // the tiddler being deleted different to one in store
	strictEqual(store.isDirty(), false);
});


test("copyTiddler", function() {
	var cmd = config.commands.publishTiddler;
	var tiddler = new Tiddler("pig");
	var expected = false;
	tiddler.fields["server.workspace"] = "bags/jon_private";
	// add to store.
	store.saveTiddler(tiddler);
	store.getTiddler("pig").getAdaptor = function() {
		var adaptor = {
			putTiddler: function(tiddler, context, userParams, callback) {
				var fields = tiddler.fields;
				if(fields["server.workspace"] == "bags/jon_public" &&
					fields["server.page.revision"] == "false") {
					expected = true;
				}
			}
		};
		return adaptor;
	};
	cmd.copyTiddler("pig", "bags/jon_public");

	strictEqual(true, expected);
});

test("moveTiddler from private to public with rename (without revisions)", function() {
	var cmd = config.commands.publishTiddler;
	var tiddler = new Tiddler("pig");
	var expected = 0;
	config.commands.publishTiddler.copyTiddler = function(oldTitle, newWorkspace, callback) {
		if(expected === 0) { // copy is the first thing that should happen.
			expected = 1;
			callback({status: true}); // signal it was a success
		}
	};
	tiddler.fields["server.workspace"] = "bags/jon_private";
	tiddler.getAdaptor = function() {
		var adaptor = {
			deleteTiddler: function(tiddler, context, userParams, callback) {
				if(expected == 1) {
					if(tiddler.title == "pig" &&
						tiddler.fields["server.workspace"] == "bags/jon_private") {
						expected = 2;
					}
				}
			}
		};
		return adaptor;
	};
	var newTiddler = { title: "babe", fields: { "server.workspace": "bags/jon_public" } };
	cmd.moveTiddler(tiddler, newTiddler, false);
	strictEqual(2, expected);
});

test("moveTiddler put fails (without revisions)", function() {
	var cmd = config.commands.publishTiddler;
	var tiddler = new Tiddler("pig");
	var happy = true;
	config.commands.publishTiddler.copyTiddler = function(oldTitle, newWorkspace, callback) {
			callback({status: false}); // the copy failed for some reason
	};

	tiddler.fields["server.workspace"] = "bags/jon_private";
	tiddler.getAdaptor = function() {
		var adaptor = {
			deleteTiddler: function(tiddler, context, userParams, callback) {
				happy = false;
			}
		};
		return adaptor;
	};
	var newTiddler = { title: "babe", fields: { "server.workspace": "bags/jon_public" } };
	cmd.moveTiddler(tiddler, newTiddler, false);
	strictEqual(true, happy);
});

test("moveTiddler from private to private (without revisions)", function() {
	var cmd = config.commands.publishTiddler;
	var tiddler = new Tiddler("pig");
	var happyPath = true;
	config.commands.publishTiddler.copyTiddler = function(oldTitle, newWorkspace, callback) {
		callback({status: true});
	};
	tiddler.fields["server.workspace"] = "bags/jon_private";
	// add to store.
	tiddler.getAdaptor = function() {
		var adaptor = {
			deleteTiddler: function(tiddler, context, userParams, callback) {
				happyPath = false;
			}
		};
		return adaptor;
	};
	var newTiddler = { fields: { "server.workspace": "bags/jon_private" } };
	cmd.moveTiddler(tiddler, newTiddler, false);
	strictEqual(true, happyPath);
});

test("moveTiddlerWithRevisions (attempt from bag back to same bag)", function() {
	var cmd = config.commands.publishTiddler;
	var tiddler = new Tiddler("pig");
	var attemptedDelete = false;

	tiddler.fields["server.bag"] = "jon_private";
	// add to store.
	tiddler.getAdaptor = function() {
		var adaptor = {
			deleteTiddler: function(tiddler, context, userParams, callback) {
				attemptedDelete = true;
			},
			moveTiddler: function(from, to, context, userParams, callback) {
				if(pathStep == 1) {
					pathStep = 2;
				}
			}
		};
		return adaptor;
	};
	var newTiddler = { title: "pig", fields: { "server.workspace": "bags/jon_private" } };
	cmd.moveTiddlerWithRevisions(tiddler, newTiddler, false);
	strictEqual(attemptedDelete, false);
});

test("moveTiddlerWithRevisions and rename", function() {
	var cmd = config.commands.publishTiddler;
	var tiddler = new Tiddler("pig");
	var pathStep = 0;

	config.commands.publishTiddler.copyTiddler = function(oldTitle, newWorkspace, callback) {
		callback({status: true});
	};
	tiddler.fields["server.workspace"] = "bags/jon_private";
	// add to store.
	tiddler.getAdaptor = function() {
		var adaptor = {
			deleteTiddler: function(tiddler, context, userParams, callback) {
				happyPath = false;
				var workspace = tiddler.fields["server.workspace"];
				if(pathStep === 0) {
					if(tiddler.title == "cow" && workspace == "bags/jon_public") { // delete existing tiddler in that bag
						pathStep = 1;
						callback({status: true}); // successful delete
					}
				}
			},
			moveTiddler: function(from, to, context, userParams, callback) {
				if(pathStep == 1) {
					pathStep = 2;
				}
			}
		};
		return adaptor;
	};
	var newTiddler = { title: "cow", fields: { "server.workspace": "bags/jon_public" } };
	cmd.moveTiddlerWithRevisions(tiddler, newTiddler, false);
	strictEqual(2, pathStep);
});

})(QUnit.module, jQuery);
