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
		var tid1 = new Tiddler("bfoo");
		tid1.fields["server.bag"] = "foo_public";
		var tid2 = new Tiddler("bfoo2");
		tid2.fields["server.bag"] = "foo_private";
		var tid3 = new Tiddler("bfoo3");
		tid3.fields["server.bag"] = "bar_public";
		store.saveTiddler(tid1);
		store.saveTiddler(tid2);
		store.saveTiddler(tid3);
	},
	teardown: function() {
		var toDelete = ["pig", "foo", "foo [draft]", "foo [draft2]", "foo [draft3]",
			"foo [draft5]", "bar [draft]", "bfoo", "bfoo2", "bfoo3"];
		for(var i = 0; i < toDelete.length; i++) {
			store.removeTiddler(toDelete[i]);
		}
		TiddlyWiki.isStandardField = _isStandardField;
		config.commands.publishTiddler.copyTiddler = _copy;
		readOnly = _readOnly;
	}
});

test("tiddlyspace.getTiddlerStatusType", function() {
	var tiddlyspace = config.extensions.tiddlyspace;

	var type1 = tiddlyspace.getTiddlerStatusType(store.getTiddler("bfoo"));
	var type2 = tiddlyspace.getTiddlerStatusType(store.getTiddler("bfoo2"));
	var type3 = tiddlyspace.getTiddlerStatusType(store.getTiddler("bfoo3"));
	var type4 = tiddlyspace.getTiddlerStatusType(new Tiddler("ToolbarCommands"));
	var type5 = tiddlyspace.getTiddlerStatusType(new Tiddler("MainMenuNotExistanceTiddler"));
	var type6 = tiddlyspace.getTiddlerStatusType(false);
	strictEqual(type1, "public");
	strictEqual(type2, "private");
	strictEqual(type3, "external");
	strictEqual(type4, "shadow");
	strictEqual(type5, "missing");
	strictEqual(type6, "missing");
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
	cmd.moveTiddler(tiddler, newTiddler);
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
	cmd.moveTiddler(tiddler, newTiddler);
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
	cmd.moveTiddler(tiddler, newTiddler);
	strictEqual(true, happyPath);
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
	cmd.moveTiddler(tiddler, newTiddler, callback);
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
	cmd.moveTiddler(tiddler, newTiddler, callback);
	strictEqual(asExpected, true);
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
	store.saveTiddler(tiddler);
	var draftEnabled = config.commands.saveDraft.isEnabled(tiddler);
	var changeToPrivateEnabled = config.commands.changeToPrivate.isEnabled(tiddler);
	var changeToPublicEnabled = config.commands.changeToPublic.isEnabled(tiddler);

	strictEqual(draftEnabled, false);
	strictEqual(changeToPrivateEnabled, false);
	strictEqual(changeToPublicEnabled, true);
});

test("enabled commands (public)", function() {
	var tiddler = new Tiddler("foo");
	tiddler.fields = {"server.bag": "foo_public"};
	store.saveTiddler(tiddler);
	var draftEnabled = config.commands.saveDraft.isEnabled(tiddler);
	var changeToPrivateEnabled = config.commands.changeToPrivate.isEnabled(tiddler);
	var changeToPublicEnabled = config.commands.changeToPublic.isEnabled(tiddler);

	strictEqual(draftEnabled, true);
	strictEqual(changeToPrivateEnabled, true);
	strictEqual(changeToPublicEnabled, false);
});

test("enabled commands (included)", function() {
	var tiddler = new Tiddler("foo");
	tiddler.fields = {"server.bag": "xyz_public"};
	store.saveTiddler(tiddler);
	var draftEnabled = config.commands.saveDraft.isEnabled(tiddler);
	var changeToPrivateEnabled = config.commands.changeToPrivate.isEnabled(tiddler);
	var changeToPublicEnabled = config.commands.changeToPublic.isEnabled(tiddler);

	strictEqual(draftEnabled, false);
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
	var draftEnabled = config.commands.saveDraft.isEnabled(tiddler);
	var changeToPrivateEnabled = config.commands.changeToPrivate.isEnabled(tiddler);
	var changeToPublicEnabled = config.commands.changeToPublic.isEnabled(tiddler);

	strictEqual(draftEnabled, false);
	strictEqual(changeToPrivateEnabled, false);
	strictEqual(changeToPublicEnabled, false);
});

var _moveTiddler;
module("TiddlySpacePublishingCommands / TiddlySpacePublisher", {
	setup: function() {
		_moveTiddler = config.commands.publishTiddler.moveTiddler;
		config.commands.publishTiddler.moveTiddler = function(tiddler, newTiddler, callback) {
			callback(newTiddler);
		};
	},
	teardown: function() {
		config.commands.publishTiddler.moveTiddler = _moveTiddler;
	}
});

test("getMode", function() {
	var macro = config.macros.TiddlySpacePublisher;
	var paramString1 = {
		parseParams: function() {
			return [{
				"type": ["private"]
			}]
		}
	};
	var paramString2 = {
		parseParams: function() {
			return [{
				"type": ["public"]
			}]
		}
	};
	var paramString3 = {
		parseParams: function() {
			return [{
				"type": ["badvalue"]
			}]
		}
	};

	// run
	var mode1 = macro.getMode(paramString1);
	var mode2 = macro.getMode(paramString2);
	var mode3 = macro.getMode(paramString3);
	strictEqual(mode1[0], "private");
	strictEqual(mode1[1], "public");
	strictEqual(mode2[0], "public");
	strictEqual(mode2[1], "private");
	strictEqual(mode3[0], "private");
	strictEqual(mode3[1], "public");
});

test("changeStatus to private", function() {
	// setup
	var tiddlers = [];
	var tiddler = new Tiddler("foo");
	tiddler.fields["server.bag"] = "jon_public";
	tiddlers.push(tiddler);
	tiddler = new Tiddler("bar");
	tiddler.fields["server.bag"] = "jon_private";
	tiddlers.push(tiddler);
	tiddler = new Tiddler("dum");
	tiddler.fields["server.bag"] = "jon_public";
	tiddlers.push(tiddler);
	var macro = config.macros.TiddlySpacePublisher;
	var bad = false;
	var callback = function(newTiddler) {
		if(newTiddler.fields["server.bag"] != "jon_private") {
			bad = true;
		}
	};

	// run
	macro.changeStatus(tiddlers, "private", callback);

	// verify
	strictEqual(bad, false, "all tiddlers should now be private, including those that were before.");
});

test("changeStatus to public", function() {
	// setup
	var tiddlers = [];
	var tiddler = new Tiddler("foo");
	tiddler.fields["server.bag"] = "jon_public";
	tiddlers.push(tiddler);
	tiddler = new Tiddler("bar");
	tiddler.fields["server.bag"] = "foo_private";
	tiddlers.push(tiddler);
	tiddler = new Tiddler("dum");
	tiddler.fields["server.bag"] = "jon_public";
	tiddlers.push(tiddler);
	var macro = config.macros.TiddlySpacePublisher;
	var bad = false;
	var callback = function(newTiddler) {
		var expected = "jon_public";
		if(newTiddler.title == "bar") {
			expected = "foo_public";
		}
		if(newTiddler.fields["server.bag"] != expected) {
			bad = true;
		}
	};

	// run
	macro.changeStatus(tiddlers, "public", callback);

	// verify
	strictEqual(bad, false, "all tiddlers should now be private, including those that were before.");
});

})(QUnit.module, jQuery);
