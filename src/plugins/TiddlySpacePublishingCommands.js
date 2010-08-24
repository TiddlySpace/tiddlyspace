/***
|''Name''|TiddlySpacePublishingCommands|
|''Version''|0.5.2|
|''Status''|@@beta@@|
|''Description''|toolbar commands for drafting and publishing|
|''Author''|Jon Robson|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/raw/master/src/plugins/TiddlySpacePublishingCommands.js|
|''Requires''|TiddlySpaceConfig ServerSideSavingPlugin|
!Code
***/
//{{{
(function($) {

var tiddlyspace = config.extensions.tiddlyspace;

var cmd = config.commands.publishTiddler = {
	text: "publish",
	tooltip: "Change the public/private state of this tiddler",
	errorMsg: "Error publishing %0: %1",

	isEnabled: function(tiddler) {
		if(readOnly || !store.tiddlerExists(tiddler.title)) {
			return false;
		}
		var space = tiddlyspace.determineSpace(tiddler, true);
		return space && space.name == tiddlyspace.currentSpace.name &&
			space.type == "private";
	},
	handler: function(ev, src, title) {
		var tiddler = store.getTiddler(title);
		if(tiddler) {
			var newWorkspace = tiddler.fields["server.workspace"];
			newWorkspace = cmd.toggleWorkspace(newWorkspace);
			this.moveTiddler(tiddler, {
				title: tiddler.title,
				fields: { "server.workspace": newWorkspace }
			}, true);
		}
	},
	toggleWorkspace: function(workspace, to) {
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
	getPrivateWorkspace: function(tiddler) {
		var workspace = tiddler.fields["server.workspace"];
		return workspace.replace("_public", "_private");
	},
	getPublicWorkspace: function(tiddler) {
		var workspace = tiddler.fields["server.workspace"];
		return workspace.replace("_private", "_public");
	},
	copyTiddler: function(title, newWorkspace, callback) {
		var original = store.getTiddler(title);
		var space = tiddlyspace.determineSpace(original);
		var adaptor = original.getAdaptor();
		var publish = function(original, callback) {
			var tiddler = $.extend(new Tiddler(original.title), original);
			tiddler.fields = $.extend({}, original.fields, {
				"server.workspace": newWorkspace || "bags/%0_%1".format([space.name, type]),
				"server.page.revision": "false"
			});
			delete tiddler.fields["server.etag"];
			adaptor.putTiddler(tiddler, null, null, callback);
		};
		publish(original, callback);
	},
	moveTiddler: function(tiddler, newTiddler, withRevisions, callback) {
		if(withRevisions) {
			this.moveTiddlerWithRevisions(tiddler, newTiddler, callback);
		} else {
			var adaptor = tiddler.getAdaptor();
			var newTitle = newTiddler.title;
			var oldTitle = tiddler.title;
			var newWorkspace = newTiddler.fields["server.workspace"];

			cmd.copyTiddler(oldTitle, newWorkspace, function(ctx) {
					var context = {
						tiddler: tiddler,
						workspace: newWorkspace
					};
					tiddler.title = oldTitle; // for cases where a rename occurs
					adaptor.deleteTiddler(tiddler, context, {}, function() {
						if(callback) {
							callback();
						} else {
							store.removeTiddler(oldTitle);
							story.closeTiddler(oldTitle);
							store.addTiddler(ctx.tiddler);
							story.refreshTiddler(newTitle, true);
							story.displayTiddler(place, newTitle);
						}
					});
			});
		}
	},
	moveTiddlerWithRevisions: function(tiddler, newTiddler, callback) {
		var adaptor = tiddler.getAdaptor();
		var oldWorkspace = tiddler.fields["server.workspace"];
		var oldTitle = tiddler.title;
		var newTitle = newTiddler.title;
		var newWorkspace = newTiddler.fields["server.workspace"];

		// we first must delete any existing public revisions
		tiddler.title = newTitle;
		tiddler.fields["server.workspace"] = newWorkspace;
		tiddler.fields["server.page.revision"] = "false"; // force this action

		adaptor.deleteTiddler(tiddler, { workspace: newWorkspace }, {},
			function(ctx) {
				tiddler.fields["server.workspace"] = oldWorkspace; // rectify above change to workspace
				adaptor.moveTiddler(
					{ title: oldTitle, workspace: oldWorkspace },
					{ title: newTitle, workspace: newWorkspace },
					{}, {},
					function(context) {
						var newTiddler = context.tiddler;
						// some some reason the old tiddler is not being removed from the store (hence next 3 lines)
						var oldDirty = store.isDirty();
						store.removeTiddler(oldTitle);
						store.setDirty(oldDirty);
						store.addTiddler(newTiddler); // note the tiddler may have changed name
						if(callback) {
							callback();
						}
						var old = story.refreshTiddler(oldTitle, true);
						if(old) {
							story.displayTiddler(old, newTitle);
						}
					}
				);
		});
	}
};

config.commands.changeToPrivate = {
	text: "make private",
	tooltip: "turn this public tiddler into a private tiddler",
	handler: function(event, src, title) {
		var tiddler = store.getTiddler(title);
		var newWorkspace = cmd.getPrivateWorkspace(tiddler);
		var newTiddler = { title: title, fields: { "server.workspace": newWorkspace }};
		cmd.moveTiddler(tiddler, newTiddler, true);
	}
};
config.commands.changeToPublic = {
	text: "make public",
	tooltip: "turn this private tiddler into a public tiddler",
	handler: function(event, src, title) {
		var tiddler = store.getTiddler(title);
		var newWorkspace = cmd.getPublicWorkspace(tiddler);
		var newTiddler = { title: title, fields: { "server.workspace": newWorkspace }};
		cmd.moveTiddler(tiddler, newTiddler, true);
	}
};

config.commands.deleteTiddler.deleteResource = function(tiddler, workspace) {
	var originalWorkspace = tiddler.fields["server.workspace"];
	var context = {
		tiddler: tiddler,
		workspace: workspace
	};
	tiddler.fields["server.workspace"] = context.workspace;
	tiddler.fields["server.page.revision"] = "false";
	var callback;
	if(workspace == originalWorkspace) {
		callback = config.extensions.ServerSideSavingPlugin.removeTiddlerCallback;
	} else {
		var oldDirty = store.isDirty();
		callback = function(context, userParams) {
			store.setDirty(oldDirty); // will fail to delete locally and throw an error
			tiddler.fields["server.workspace"] = originalWorkspace;
			story.refreshTiddler(tiddler.title, true);
			story.displayTiddler(place, tiddler.title);
		};
	}
	tiddler.getAdaptor().deleteTiddler(tiddler, context, {}, callback);
};

config.commands.deletePublicTiddler = {
	text: "delete public",
	tooltip: "Delete any public versions of this tiddler",
	isEnabled: function(tiddler) {
		return tiddler.fields["server.workspace"];
	},
	handler: function(event, src, title) {
		var tiddler = store.getTiddler(title);
		var workspace = cmd.getPublicWorkspace(tiddler);
		config.commands.deleteTiddler.deleteResource(tiddler, workspace);
	}
};

config.commands.deletePrivateTiddler = {
	text: "delete private",
	tooltip: "delete any private versions of this tiddler",
	handler: function(event, src, title) {
		var tiddler = store.getTiddler(title);
		var workspace = cmd.getPrivateWorkspace(tiddler);
		config.commands.deleteTiddler.deleteResource(tiddler, workspace);
	}
};
/* Save as draft command */
config.commands.saveDraft = {
	text: "save draft",
	tooltip: "Save as a private draft",
	isEnabled: function(tiddler) {
		if(tiddler) {
			var workspace = tiddler.fields["server.workspace"];
			if(workspace && workspace.indexOf("_public") > -1) {
				return true;
			} else {
				return false;
			}
		} else {
			return false;
		}
	},
	handler: function(ev, src, title) {
		// TODO: when creating a draft also copy over revisions from the public version
		var tiddler = store.getTiddler(title); // original tiddler
		var tidEl = story.getTiddler(title);
		var fields = {};
		story.gatherSaveFields(tidEl, fields);
		var extendedFields = merge({}, config.defaultCustomFields);
		var currentSpace = tiddlyspace.currentSpace.name;
		var privateWorkspace = "recipes/%0_private".format([currentSpace]);
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

		extendedFields["server.publish.name"] = title;
		extendedFields["server.workspace"] = privateWorkspace;
		var newDate = new Date();
		for(var n in fields) {
			if(!TiddlyWiki.isStandardField(n)) {
				extendedFields[n] = fields[n];
			}
		}
		tiddler = store.saveTiddler(draftTitle, draftTitle, fields.text, config.options.txtUserName,
			newDate, fields.tags, extendedFields);
		autoSaveChanges(null, [tiddler]);
		story.closeTiddler(title);
		story.displayTiddler(src, draftTitle);
		return draftTitle;
	}
};

})(jQuery);
//}}}
