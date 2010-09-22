/***
|''Name''|TiddlySpacePublishingCommands|
|''Version''|0.7.4|
|''Status''|@@beta@@|
|''Description''|toolbar commands for drafting and publishing|
|''Author''|Jon Robson|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/raw/master/src/plugins/TiddlySpacePublishingCommands.js|
|''Requires''|TiddlySpaceConfig|
!Code
***/
//{{{
(function($) {

var tiddlyspace = config.extensions.tiddlyspace;
tiddlyspace.getTiddlerStatusType = function(tiddler) {
	var bag = tiddler.fields["server.bag"];
	var currentSpace = tiddlyspace.currentSpace.name;
	var privateBag = "%0_private".format([currentSpace]);
	var publicBag = "%0_public".format([currentSpace]);
	if(bag == privateBag) {
		return "private";
	} else if (bag == publicBag) {
		return "public";
	} else {
		return "external";
	}
};

var cmd = config.commands.publishTiddler = {
	text: "make public",
	tooltip: "Change this private tiddler into a public tiddler",
	errorMsg: "Error publishing %0: %1",

	isEnabled: function(tiddler) {
		var type = tiddlyspace.getTiddlerStatusType(tiddler);
		if(!readOnly && type == "private") {
			return true;
		} else {
			return false;
		}
	},
	handler: function(ev, src, title) {
		var tiddler = store.getTiddler(title);
		if(tiddler) {
			var newBag = cmd.toggleBag(tiddler.fields["server.bag"]);
			this.moveTiddler(tiddler, {
				title: tiddler.fields["publish.name"] || tiddler.title,
				fields: { "server.bag": newBag }
			});
		}
	},
	toggleBag: function(bag, to) {
		var newBag;
		if(typeof bag != typeof "") {
			var tiddler = bag;
			bag = tiddler.fields["server.bag"];
		}
		if(bag.indexOf("_private") > -1) { // should make use of endsWith
			to = to ? to : "public";
			newBag = bag.replace("_private", "_" + to);
		} else {
			to = to ? to : "private";
			newBag = bag.replace("_public", "_" + to);
		}
		return newBag;
	},
	toggleWorkspace: function(workspace, to) {
		if(typeof workspace != typeof "") {
			var tiddler = workspace;
			var bag = tiddler.fields["server.bag"];
			workspace = bag ? "bags/%0".format([bag]) : tiddler.fields["server.workspace"];
		}
		var newWorkspace;
		if(workspace.indexOf("_private") > -1) { // should make use of endsWith
			to = to ? to : "public";
			newWorkspace = workspace.replace("_private", "_" + to);
		} else {
			to = to ? to : "private";
			newWorkspace = workspace.replace("_public", "_" + to);
		}
		return newWorkspace;
	},
	copyTiddler: function(title, newTitle, newBag, callback) {
		var original = store.getTiddler(title);
		newTitle = newTitle ? newTitle : title;
		var adaptor = original.getAdaptor();
		var publish = function(original, callback) {
			var tiddler = $.extend(new Tiddler(newTitle), original);
			tiddler.fields = $.extend({}, original.fields, {
				"server.bag": newBag,
				"server.workspace": "bags/%0".format([newBag]),
				"server.page.revision": "false"
			});
			tiddler.title = newTitle;
			adaptor.putTiddler(tiddler, null, null, callback);
		};
		publish(original, callback);
	},
	moveTiddler: function(tiddler, newTiddler, withRevisions, callback) {
		if(withRevisions) {
			this.moveTiddlerWithRevisions(tiddler, newTiddler, callback);
		} else {
			var info = {
				copyContext: {},
				deleteContext: {}
			};
			var _dirty = store.isDirty();
			var adaptor = tiddler.getAdaptor();
			var newTitle = newTiddler.title;
			var oldTitle = tiddler.title;
			delete tiddler.fields["server.workspace"];
			var oldBag = tiddler.fields["server.bag"];
			var newBag = newTiddler.fields["server.bag"];
			var newWorkspace = "bags/%0".format([newBag]);
			cmd.copyTiddler(oldTitle, newTitle, newBag, function(ctx) {
					info.copyContext = ctx;
					var context = {
						tiddler: tiddler,
						workspace: newWorkspace
					};
					store.addTiddler(ctx.tiddler);
					tiddler.title = oldTitle; // for cases where a rename occurs
					if(ctx.status) { // only do if a success
						if(oldBag != newBag) {
							adaptor.deleteTiddler(tiddler, context, {}, function(ctx) {
								info.deleteContext = ctx;
								var el;
								if(tiddler) {
									tiddler.fields["server.workspace"] = newWorkspace;
									tiddler.fields["server.bag"] = newBag;
								}
								el = el ? el : story.refreshTiddler(oldTitle, null, true);
								if(oldTitle != newTitle) {
									store.removeTiddler(oldTitle);
								}
								if(el) {
									story.displayTiddler(el, newTitle);
								}
								if(oldTitle != newTitle) {
									story.closeTiddler(oldTitle);
								}
								if(callback) {
									callback(info);
								}
								store.setDirty(_dirty);
								story.refreshTiddler(newTitle, null, true); // for drafts
							});
						} else {
							if(callback) {
								callback(info);
							}
							story.refreshTiddler(newTitle, null, true);
						}
					}
			});
		}
	},
	moveTiddlerWithRevisions: function(tiddler, newTiddler, callback) {
		var adaptor = tiddler.getAdaptor();
		var oldBag = tiddler.fields["server.bag"];
		var oldTitle = tiddler.title;
		var newTitle = newTiddler.title;
		var newBag = newTiddler.fields["server.bag"];
		delete tiddler.fields["server.workspace"];
		delete newTiddler.fields["server.workspace"];
		var oldWorkspace = "bags/%0".format([oldBag]);
		var newWorkspace = "bags/%0".format([newBag]);
		var info = {};
		if(oldBag == newBag) { // we are in a dangerous error state
			return callback ? callback(info) : false;
		}
		// we first must delete any existing public revisions
		tiddler.title = newTitle;
		tiddler.fields["server.bag"] = newBag;
		tiddler.fields["server.workspace"] = newWorkspace;
		tiddler.fields["server.page.revision"] = "false"; // force this action
		adaptor.deleteTiddler(tiddler, {}, {},
			function(ctx) {
				info.deleteContext = ctx;
				tiddler.fields["server.workspace"] = oldWorkspace;
				tiddler.fields["server.bag"] = oldBag; // rectify above change to workspace
				adaptor.moveTiddler(
					{ title: oldTitle, workspace: oldWorkspace },
					{ title: newTitle, workspace: newWorkspace },
					{}, {},
					function(context) {
						info.moveContext = context;
						if(context.status) {
							var newTiddler = context.tiddler;
							newTiddler.fields["server.workspace"] = newWorkspace;
							// some some reason the old tiddler is not being removed from the store (hence next 3 lines)
							var oldDirty = store.isDirty();
							store.removeTiddler(oldTitle);
							store.setDirty(oldDirty);
							store.addTiddler(newTiddler); // note the tiddler may have changed name
							var old = story.refreshTiddler(oldTitle, null, true);
							if(old) {
								story.displayTiddler(old, newTitle);
							}
							story.refreshTiddler(newTitle, null, true); // for case of drafts
						}
						if(callback) {
							callback(info);
						}
					}
				);
		});
	}
};

config.commands.changeToPrivate = {
	text: "make private",
	tooltip: "turn this public tiddler into a private tiddler",
	isEnabled: function(tiddler) {
		var type = tiddlyspace.getTiddlerStatusType(tiddler);
		if(!readOnly && type == "public") {
			return true;
		} else {
			return false;
		}
	},
	handler: function(event, src, title) {
		var tiddler = store.getTiddler(title);
		var newBag = cmd.toggleBag(tiddler, "private");
		var newTiddler = { title: title, fields: { "server.bag": newBag }};
		cmd.moveTiddler(tiddler, newTiddler, false);
	}
};
config.commands.changeToPublic = config.commands.publishTiddler;

config.commands.deleteTiddler.deleteResource = function(tiddler, bag, userCallback) {
	var workspace = "bags/%0".format([bag]);
	var oldDirty = store.isDirty();
	var originalBag = tiddler.fields["server.bag"];
	var originalWorkspace = "bags/%0".format([originalBag]);
	var deleteLocal = originalWorkspace == workspace;
	var context = {
		tiddler: tiddler,
		workspace: workspace
	};
	tiddler.fields["server.bag"] = bag;
	tiddler.fields["server.workspace"] = context.workspace;
	tiddler.fields["server.page.revision"] = "false";
	var defaultWorkspace = config.defaultCustomFields["server.workspace"];
	delete tiddler.fields["server.etag"];
	var callback;
	if(deleteLocal) {
		var _dirty = store.isDirty();
		callback = function(context, userParams) {
			var title = tiddler.title;
			store.removeTiddler(title);
			context.adaptor.getTiddler(title, { workspace: defaultWorkspace }, null, function(context) {
				if(context.status) {
					store.addTiddler(context.tiddler);
					story.refreshTiddler(title, null, true);
					userCallback(context);
				}
				store.setDirty(_dirty);
			});
		};
	} else {
		callback = function(context, userParams) {
			if(context.status) {
				tiddler.fields["server.workspace"] = originalWorkspace;
				tiddler.fields["server.bag"] = originalBag;
				story.refreshTiddler(tiddler.title, null, true);
				store.setDirty(oldDirty); // will fail to delete locally and throw an error
			}
			if(userCallback) {
				userCallback(context);
			}
		};
	}
	tiddler.getAdaptor().deleteTiddler(tiddler, context, {}, callback);
};

config.commands.deletePublicTiddler = {
	text: "delete public",
	tooltip: "Delete any public versions of this tiddler",
	isEnabled: function(tiddler) {
		var type = tiddlyspace.getTiddlerStatusType(tiddler);
		if(!readOnly && type == "private") {
			return true;
		} else {
			return false;
		}
	},
	handler: function(event, src, title) {
		var tiddler = store.getTiddler(title);
		var bag = cmd.toggleBag(tiddler, "public");
		config.commands.deleteTiddler.deleteResource(tiddler, bag);
	}
};

config.commands.deletePrivateTiddler = {
	text: "delete private",
	tooltip: "delete any private versions of this tiddler",
	isEnabled: function(tiddler) {
		var type = tiddlyspace.getTiddlerStatusType(tiddler);
		if(!readOnly && type == "public") {
			return true;
		} else {
			return false;
		}
	},
	handler: function(event, src, title) {
		var tiddler = store.getTiddler(title);
		var bag = cmd.toggleBag(tiddler, "private");
		config.commands.deleteTiddler.deleteResource(tiddler, bag);
	}
};
/* Save as draft command */
var saveDraftCmd = config.commands.saveDraft = {
	text: "save draft",
	tooltip: "Save as a private draft",
	isEnabled: function(tiddler) {
		var type = tiddlyspace.getTiddlerStatusType(tiddler);
		if(!readOnly && type == "public") {
			return true;
		} else {
			return false;
		}
	},
	getDraftTitle: function(title) {
		var draftTitle;
		var draftNum = "";
		while(!draftTitle) {
			var suggestedTitle = "%0 [draft%1]".format([title, draftNum]);
			if(store.getTiddler(suggestedTitle)) {
				draftNum = !draftNum ? 2 : draftNum + 1;
			} else {
				draftTitle = suggestedTitle;
			}
		}
		return draftTitle;
	},
	createDraftTiddler: function(title, gatheredFields) {
		var tiddler = store.getTiddler(title);
		var draftTitle = saveDraftCmd.getDraftTitle(title);
		var draftTiddler = new Tiddler(draftTitle);
		if(tiddler) {
			$.extend(true, draftTiddler, tiddler);
		} else {
			$.extend(draftTiddler.fields, config.defaultCustomFields);
		}
		for(var fieldName in gatheredFields) {
			if(TiddlyWiki.isStandardField(fieldName)) {
				draftTiddler[fieldName] = gatheredFields[fieldName];
			} else {
				draftTiddler.fields[fieldName] = gatheredFields[fieldName];
			}
		}
		var currentSpace = tiddlyspace.currentSpace.name;
		var privateBag = "%0_private".format([currentSpace])
		var privateWorkspace = "bags/%0".format([privateBag]);
		draftTiddler.title = draftTitle;
		draftTiddler.fields["publish.name"] = title;
		draftTiddler.fields["server.workspace"] = privateWorkspace;
		draftTiddler.fields["server.bag"] = privateBag;
		draftTiddler.fields["server.title"] = draftTitle;
		draftTiddler.fields["server.page.revision"] = "false";
		delete draftTiddler.fields["server.etag"];
		return draftTiddler;
	},
	handler: function(ev, src, title) {
		var tiddler = store.getTiddler(title); // original tiddler
		var tidEl = story.getTiddler(title);
		var uiFields = {};
		story.gatherSaveFields(tidEl, uiFields);
		var tid = saveDraftCmd.createDraftTiddler(title, uiFields);
		tid = store.saveTiddler(tid.title, tid.title, tid.text, tid.modifier,
			new Date(), tid.tags, tid.fields);
		autoSaveChanges(null, [tid]);
		story.closeTiddler(title);
		story.displayTiddler(src, tid.title);
	}
};

})(jQuery);
//}}}
