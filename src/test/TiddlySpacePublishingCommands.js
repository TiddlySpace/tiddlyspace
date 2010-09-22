(function(module, $) {

var _copy, _readOnly, _isStandardField;
module("TiddlySpacePublishingCommands", {
	setup: function() {
		_copy = config.commands.publishTiddler.copyTiddler;
		_readOnly = readOnly;
		_isStandardField = TiddlyWiki.isStandardField;
		TiddlyWiki.isStandardField = function(field) {
			if(field == "title" || field == "tags" || field == "text") {
				return true;
			} else {
				return false;
			}
		}
		readOnly = false;
	},
	teardown: function() {
		var toDelete = ["pig", "foo", "foo [draft]", "foo [draft2]", "foo [draft3]", 
			"foo [draft5]", "bar [draft]"];
		for(var i = 0; i < toDelete.length; i++) {
			store.removeTiddler(toDelete[i]);
		}
		TiddlyWiki.isStandardField = _isStandardField;
		config.commands.publishTiddler.copyTiddler = _copy;
		readOnly = _readOnly;
	}
});

test("getDraftTitle", function() {
	// setup
	var cmd = config.commands.saveDraft;
	store.saveTiddler(new Tiddler("foo [draft]"));
	store.saveTiddler(new Tiddler("foo [draft2]"));
	store.saveTiddler(new Tiddler("foo [draft3]"));
	store.saveTiddler(new Tiddler("foo [draft5]"));
	store.saveTiddler(new Tiddler("bar [draft]"));

	// run
	var title1 = cmd.getDraftTitle("foo");
	var title2 = cmd.getDraftTitle("bar");
	var title3 = cmd.getDraftTitle("dum");

	// verify
	strictEqual(title1, "foo [draft4]");
	strictEqual(title2, "bar [draft2]");
	strictEqual(title3, "dum [draft]");
});

test("createDraftTiddler", function() {
	// setup
	var cmd = config.commands.saveDraft;
	var tiddler = new Tiddler("foo");
	tiddler.tags = ["foo", "bar"];
	tiddler.text = "not a draft";
	tiddler.fields["geo.long"] = "3";
	tiddler.fields["geo.lat"] = "2";
	tiddler.fields["server.title"] = "foo";
	tiddler.fields["server.page.revision"] = "10";
	tiddler.fields["server.etag"] = "xyz10xyz";
	tiddler.fields["server.bag"] = "foo_public";
	store.saveTiddler(tiddler);
	var gatheredFields = { text: "a draft", bar: "xyz", tags: "foo [[link 2]]" };

	// run
	var draftTiddler = cmd.createDraftTiddler("foo", gatheredFields);

	// verify
	var fields = draftTiddler.fields;
	strictEqual(draftTiddler.title, "foo [draft]");
	strictEqual(draftTiddler.tags, "foo [[link 2]]");
	strictEqual(draftTiddler.text, "a draft");
	strictEqual(fields["server.bag"], "foo_private");
	strictEqual(fields["server.page.revision"], "false");
	strictEqual(fields["server.title"], "foo [draft]");
	strictEqual(fields["server.workspace"], "bags/foo_private");
	strictEqual(fields["publish.name"], "foo");
	strictEqual(fields["geo.long"], "3");
	strictEqual(fields["geo.lat"], "2");
	strictEqual(typeof(fields["server.etag"]), "undefined")

	tiddler = store.getTiddler("foo");
	strictEqual(tiddler.fields["server.bag"], "foo_public", "checks old tiddler retained");
	strictEqual(typeof(tiddler.fields["server.workspace"]), "undefined", "checks old tiddler retained");
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
				if(tiddler.fields["server.workspace"] == "bags/jon_public" &&
					tiddler.fields["server.bag"] == "jon_public" && 
					!tiddler.fields["server.etag"]) {
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
					fields["server.bag"] == "jon_public" &&
					fields["server.page.revision"] == "false") {
					expected = true;
				}
			}
		};
		return adaptor;
	};
	cmd.copyTiddler("pig", false, "jon_public");

	strictEqual(true, expected);
});

test("moveTiddler from private to public with rename (without revisions)", function() {
	var cmd = config.commands.publishTiddler;
	var tiddler = new Tiddler("pig");
	var expected = 0;
	config.commands.publishTiddler.copyTiddler = function(oldTitle, newTitle, newWorkspace, callback) {
		if(expected === 0) { // copy is the first thing that should happen.
			expected = 1;
			callback({status: true, tiddler: tiddler}); // signal it was a success
		}
	};
	tiddler.fields["server.bag"] = "jon_private";
	tiddler.fields["server.workspace"] = "bags/jon_private";
	tiddler.getAdaptor = function() {
		var adaptor = {
			deleteTiddler: function(tiddler, context, userParams, callback) {
				if(expected == 1) {
					if(tiddler.title == "pig" &&
						tiddler.fields["server.bag"] == "jon_private") {
						expected = 2;
					}
				}
			}
		};
		return adaptor;
	};
	var newTiddler = { title: "babe", fields: { "server.bag": "jon_public" } };
	cmd.moveTiddler(tiddler, newTiddler, false);
	strictEqual(2, expected);
});

test("moveTiddler put fails (without revisions)", function() {
	var cmd = config.commands.publishTiddler;
	var tiddler = new Tiddler("pig");
	var happy = true;
	config.commands.publishTiddler.copyTiddler = function(oldTitle, newTitle, newWorkspace, callback) {
			callback({status: false, tiddler: tiddler}); // the copy failed for some reason
	};

	tiddler.fields["server.bag"] = "jon_private";
	tiddler.fields["server.workspace"] = "bags/jon_private";
	tiddler.getAdaptor = function() {
		var adaptor = {
			deleteTiddler: function(tiddler, context, userParams, callback) {
				happy = false;
			}
		};
		return adaptor;
	};
	var newTiddler = { title: "babe", fields: { "server.bag": "jon_public" } };
	cmd.moveTiddler(tiddler, newTiddler, false);
	strictEqual(true, happy);
});

test("moveTiddler from private to private (without revisions)", function() {
	var cmd = config.commands.publishTiddler;
	var tiddler = new Tiddler("pig");
	var happyPath = true;
	config.commands.publishTiddler.copyTiddler = function(oldTitle, newTitle, newBag, callback) {
		if(newBag != "jon_private")  {
			happyPath = false;
		}
		callback({status: true, tiddler: tiddler});
	};

	tiddler.fields["server.bag"] = "jon_private";
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
	var newTiddler = { fields: { "server.bag": "jon_private" } };
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
	var newTiddler = { title: "pig", fields: { "server.bag" : "jon_private", "server.workspace": "bags/jon_private" } };
	cmd.moveTiddlerWithRevisions(tiddler, newTiddler, false);
	strictEqual(attemptedDelete, false);
});

test("moveTiddlerWithRevisions and rename", function() {
	var cmd = config.commands.publishTiddler;
	var tiddler = new Tiddler("pig");
	var pathStep = 0;

	config.commands.publishTiddler.copyTiddler = function(oldTitle, newTitle, newWorkspace, callback) {
		callback({status: true});
	};
	tiddler.fields["server.bag"] = "jon_private";
	tiddler.fields["server.workspace"] = "bags/jon_private";
	// add to store.
	tiddler.getAdaptor = function() {
		var adaptor = {
			deleteTiddler: function(tiddler, context, userParams, callback) {
				happyPath = false;
				var workspace = tiddler.fields["server.workspace"];
				if(pathStep === 0) {
					if(tiddler.title == "cow" && tiddler.fields["server.bag"] == "jon_public" &&
						workspace == "bags/jon_public") { // delete existing tiddler in that bag
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
	var newTiddler = { title: "cow", fields: { "server.bag": "jon_public", "server.workspace": "bags/jon_public" } };
	cmd.moveTiddlerWithRevisions(tiddler, newTiddler, false);
	strictEqual(2, pathStep);
});

test("moveTiddler check the callback where no delete", function() {
	var cmd = config.commands.publishTiddler;
	var tiddler = new Tiddler("pig");
	var asExpected = false;
	var callback = function(context) {
		if(!context.deleteContext.data && context.copyContext.status == true
			&& context.copyContext.statusText == "hello there") {
			asExpected = true;
		}
	};
	config.commands.publishTiddler.copyTiddler = function(oldTitle, newTitle, newWorkspace, callback) {
		callback({status: true, statusText: "hello there", tiddler: tiddler}); // signal it was a success
	};
	tiddler.fields["server.bag"] = "jon_private";
	tiddler.getAdaptor = function() {
		var adaptor = {
			deleteTiddler: function(tiddler, context, userParams, callback) {
				callback({data: "foo"});
			}
		};
		return adaptor;
	};
	var newTiddler = { title: "pig", fields: { "server.bag": "jon_private" } };
	cmd.moveTiddler(tiddler, newTiddler, false, callback);
	strictEqual(asExpected, true);
});

test("moveTiddler  check the content of callbacks", function() {
	var cmd = config.commands.publishTiddler;
	var tiddler = new Tiddler("pig");
	var asExpected = false;
	var callback = function(context) {
		if(context.deleteContext.data == "foo" && context.copyContext.status == true
			&& context.copyContext.statusText == "hello there") {
			asExpected = true;
		}
	};
	config.commands.publishTiddler.copyTiddler = function(oldTitle, newTitle, newBag, callback) {
		callback({status: true, statusText: "hello there", tiddler: tiddler}); // signal it was a success
	};
	tiddler.fields["server.bag"] = "jon_private";
	tiddler.getAdaptor = function() {
		var adaptor = {
			deleteTiddler: function(tiddler, context, userParams, callback) {
				callback({data: "foo"});
			}
		};
		return adaptor;
	};
	var newTiddler = { title: "pig", fields: { "server.bag": "jon_public" } };
	cmd.moveTiddler(tiddler, newTiddler, false, callback);
	strictEqual(asExpected, true);
});

test("moveTiddlerWithRevisions check the content of callbacks", function() {
	var cmd = config.commands.publishTiddler;
	var tiddler = new Tiddler("pig");
	var actual;
	var callback = function(info) {
		actual = info;
	};
	tiddler.fields["server.bag"] = "jon_private";
	// add to store.
	tiddler.getAdaptor = function() {
		var adaptor = {
			deleteTiddler: function(tiddler, context, userParams, callback) {
				callback({deleteSuccess: "hurray", tiddler: tiddler})
			},
			moveTiddler: function(from, to, context, userParams, callback) {
				callback({moveSuccess: true, tiddler: tiddler});
			}
		};
		return adaptor;
	};
	var newTiddler = { title: "pig", fields: { "server.bag": "jon_public" } };
	cmd.moveTiddlerWithRevisions(tiddler, newTiddler, callback);
	strictEqual(actual.moveContext.moveSuccess, true);
	strictEqual(actual.deleteContext.deleteSuccess, "hurray");
});

test("publishTiddler command button", function() {
	var cmd = config.commands.publishTiddler;
	var tiddler = new Tiddler("pig");
	var asExpected = true;
	tiddler.fields["server.workspace"] = "foo/bar";
	tiddler.fields["server.bag"] = "jon_private";
	// add to store.
	store.saveTiddler(tiddler);
	store.getTiddler("pig").getAdaptor = function() {
		var adaptor = {
			deleteTiddler: function(tiddler) {
				if(tiddler.fields["server.bag"] != "jon_private") {
					asExpected = false;
				}
				if(tiddler.fields["server.workspace"] != "bags/jon_private") {
					asExpected = false;
				}
			},
			putTiddler: function(tiddler, context, userParams, callback) {
				if(tiddler.fields["server.bag"] != "jon_public") {
					asExpected = false;
				}
				if(tiddler.fields["server.workspace"] != "bags/jon_public") {
					asExpected = false;
				}
			}
		};
		return adaptor;
	};

	cmd.handler(null, null, "pig");
	strictEqual(asExpected, true);
});

test("enabled commands (private)", function() {
	var tiddler = new Tiddler("foo");
	tiddler.fields = {"server.bag": "foo_private"};
	var deletePublicEnabled = config.commands.deletePublicTiddler.isEnabled(tiddler);
	var deletePrivateEnabled = config.commands.deletePrivateTiddler.isEnabled(tiddler);
	var draftEnabled = config.commands.saveDraft.isEnabled(tiddler);
	var publishEnabled = config.commands.publishTiddler.isEnabled(tiddler);
	var changeToPrivateEnabled = config.commands.changeToPrivate.isEnabled(tiddler);
	var changeToPublicEnabled = config.commands.changeToPublic.isEnabled(tiddler);

	strictEqual(deletePublicEnabled, true);
	strictEqual(deletePrivateEnabled, false);
	strictEqual(draftEnabled, false);
	strictEqual(publishEnabled, true);
	strictEqual(changeToPrivateEnabled, false);
	strictEqual(changeToPublicEnabled, true);
});

test("enabled commands (public)", function() {
	var tiddler = new Tiddler("foo");
	tiddler.fields = {"server.bag": "foo_public"};
	var deletePublicEnabled = config.commands.deletePublicTiddler.isEnabled(tiddler);
	var deletePrivateEnabled = config.commands.deletePrivateTiddler.isEnabled(tiddler);
	var draftEnabled = config.commands.saveDraft.isEnabled(tiddler);
	var publishEnabled = config.commands.publishTiddler.isEnabled(tiddler);
	var changeToPrivateEnabled = config.commands.changeToPrivate.isEnabled(tiddler);
	var changeToPublicEnabled = config.commands.changeToPublic.isEnabled(tiddler);

	strictEqual(deletePublicEnabled, false);
	strictEqual(deletePrivateEnabled, true);
	strictEqual(draftEnabled, true);
	strictEqual(publishEnabled, false);
	strictEqual(changeToPrivateEnabled, true);
	strictEqual(changeToPublicEnabled, false);
});

test("enabled commands (included)", function() {
	var tiddler = new Tiddler("foo");
	tiddler.fields = {"server.bag": "xyz_public"};
	var deletePublicEnabled = config.commands.deletePublicTiddler.isEnabled(tiddler);
	var deletePrivateEnabled = config.commands.deletePrivateTiddler.isEnabled(tiddler);
	var draftEnabled = config.commands.saveDraft.isEnabled(tiddler);
	var publishEnabled = config.commands.publishTiddler.isEnabled(tiddler);
	var changeToPrivateEnabled = config.commands.changeToPrivate.isEnabled(tiddler);
	var changeToPublicEnabled = config.commands.changeToPublic.isEnabled(tiddler);

	strictEqual(deletePublicEnabled, false);
	strictEqual(deletePrivateEnabled, false);
	strictEqual(draftEnabled, false);
	strictEqual(publishEnabled, false);
	strictEqual(changeToPrivateEnabled, false);
	strictEqual(changeToPublicEnabled, false);
});

module("TiddlySpacePublishingCommands readOnly mode", {
	setup: function() {
		_readOnly = readOnly;
		readOnly = true;
	},
	teardown: function() {
		readOnly = _readOnly;
	}
});

test("what is enabled in readOnly mode", function() {
	var tiddler = new Tiddler("foo");
	var deletePublicEnabled = config.commands.deletePublicTiddler.isEnabled(tiddler);
	var deletePrivateEnabled = config.commands.deletePrivateTiddler.isEnabled(tiddler);
	var draftEnabled = config.commands.saveDraft.isEnabled(tiddler);
	var publishEnabled = config.commands.publishTiddler.isEnabled(tiddler);
	var changeToPrivateEnabled = config.commands.changeToPrivate.isEnabled(tiddler);
	var changeToPublicEnabled = config.commands.changeToPublic.isEnabled(tiddler);

	strictEqual(deletePublicEnabled, false);
	strictEqual(deletePrivateEnabled, false);
	strictEqual(draftEnabled, false);
	strictEqual(publishEnabled, false);
	strictEqual(changeToPrivateEnabled, false);
	strictEqual(changeToPublicEnabled, false);
});

})(QUnit.module, jQuery);
