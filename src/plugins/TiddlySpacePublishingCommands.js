/***
|''Name''|TiddlySpacePublishingCommands|
|''Version''|0.7.6dev|
|''Status''|@@beta@@|
|''Description''|toolbar commands for drafting and publishing|
|''Author''|Jon Robson|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/raw/master/src/plugins/TiddlySpacePublishingCommands.js|
|''Requires''|TiddlySpaceConfig|
!Usage
Provides changeToPrivate, changeToPublic and saveDraft commands
Provides TiddlySpacePublisher macro.
!Code
***/
//{{{
(function($) {

var tiddlyspace = config.extensions.tiddlyspace;
var currentSpace = tiddlyspace.currentSpace.name;
var originMacro = config.macros.tiddlerOrigin;
tiddlyspace.getTiddlerStatusType = function(tiddler) {
	var isShadow = store.isShadowTiddler(tiddler.title);
	var exists = store.tiddlerExists(tiddler.title);
	if(isShadow && !exists) {
		return "shadow";
	} else if(!exists) {
		return "missing";
	} else {
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
	moveTiddler: function(tiddler, newTiddler, callback) {
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
		cmd.moveTiddler(tiddler, newTiddler);
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
		var privateBag = "%0_private".format([currentSpace]);
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

var macro = config.macros.TiddlySpacePublisher = {
	locale: {
		title: "Publisher",
		updatedPrivateTiddler: "newer than published version (click {{viewPublicTiddler{%0}}} to view)",
		makePublicLabel: "Make public",
		noTiddlersText: "No tiddlers to publish",
		makePublicPrompt: "Make all the selected tiddlers public.",
		description: "Publish tiddlers to public version of this space",
		pleaseWait: "please wait while we load the publisher... "
	},

	listViewTemplate: {
		columns: [
			{ name: "Selected", field: "Selected", rowName: "title", type: "Selector" },
			{ name: "Tiddler", field: "tiddler", title: "Tiddler", type: "Tiddler" },
			{ name: "Status", field: "status", title: "Status", type: "WikiText" }
		],
		rowClasses: [
			{ className: "updated", field: "updated" },
			{ className: "notPublished", field: "notPublished" }
		]
	},

	publishedTiddlers: {}, // maps tiddler titles to a currently public tiddler where public tiddlers exist
	getPublicTiddlers: function(listWrapper, paramString, spaceName, tiddler) { // fills in publishedTiddlers variable above
		var adaptor = tiddler.getAdaptor();
		var context = {
			workspace: "recipes/%0_public".format([spaceName])
		};
		var callback = function(context, userParams) {
			if(context.status) {
				var tiddlers = context.tiddlers;
				for(var i = 0; i < tiddlers.length; i++) {
					var tid = tiddlers[i];
					macro.publishedTiddlers[tid.title] = tid;
				}
				macro.refresh(listWrapper, paramString);
			}
		};
		adaptor.getTiddlerList(context, null, callback);
	},
	makePublic: function(e, listWrapper, paramString) { // this is what is called when you click the publish button
		var wizard = new Wizard(e.target);
		var listView = wizard.getValue("listView");
		var rowNames = ListView.getSelectedRows(listView);
		var callback = function(status) {
			macro.refresh(listWrapper, paramString);
		};
		var cmd = config.commands.publishTiddler;
		var publicBag;
		for(var i = 0; i < rowNames.length; i++) {
			var title = rowNames[i];
			var tiddler = store.getTiddler(title);
			if(!publicBag) {
				publicBag = cmd.toggleBag(tiddler, "public");
			}
			macro.publishedTiddlers[title] = tiddler;
			var newTiddler = {
				title: tiddler.title,
				fields: { "server.bag": publicBag }
			};
			config.commands.publishTiddler.moveTiddler(tiddler, newTiddler, callback);
		}
	},
	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		tiddler = tiddler ? tiddler : store.getTiddlers()[0];
		var wizard = new Wizard();
		var locale = macro.locale;
		wizard.createWizard(place, locale.title);
		wizard.addStep(macro.locale.description, '<input type="hidden" name="markList" />');
		var markList = wizard.getElement("markList");
		var listWrapper = document.createElement("div");
		markList.parentNode.insertBefore(listWrapper, markList);
		listWrapper.setAttribute("refresh", "macro");
		listWrapper.setAttribute("macroName", "SpaceManager");
		listWrapper.setAttribute("params", paramString);

		$(listWrapper).text(macro.locale.pleaseWait);
		this.getPublicTiddlers(listWrapper, paramString, currentSpace, tiddler);
	},
	refresh: function(listWrapper, paramString) {
		var wizard = new Wizard(listWrapper);
		var locale = macro.locale;
		var selectedRows = [];
		ListView.forEachSelector(listWrapper, function(e, rowName) {
			if(e.checked) {
				selectedRows.push(e.getAttribute("rowName"));
			}
		});
		removeChildren(listWrapper);
		var params = paramString.parseParams("anon");
		var publishCandidates = [];
		var unpublishedTiddlers;
		var filter = params[0].filter;
		if(filter) {
			unpublishedTiddlers = store.filterTiddlers(filter[0]);
		} else {
			unpublishedTiddlers = store.getTiddlers();
		}
		var publishedTiddlers = macro.publishedTiddlers;
		var privateBag = currentSpace + "_private";
		for(var t = 0; t < unpublishedTiddlers.length; t++) {
			var include = false;
			var tiddler = unpublishedTiddlers[t];
			var bag = tiddler.fields["server.bag"];
			if(!tiddler.tags.contains("excludePublisher")) {
				if(bag == privateBag) {
					var candidate = {
						title: tiddler.title,
						tiddler: tiddler
					};
					var publishedTiddler = publishedTiddlers[tiddler.title];
					if(!publishedTiddler) {
						candidate.status = "unpublished";
						include = true;
						candidate.notPublished = true;
					} else if(!originMacro.areIdentical(tiddler, publishedTiddler)) {
						candidate.status = locale.updatedPrivateTiddler.format([tiddler.title]);
						candidate.publicTiddler = publishedTiddler;
						candidate.updated = true;
						include = true;
					}
					if(include) {
						publishCandidates.push(candidate);
					}
				}
			}
		}

		if(publishCandidates.length === 0) {
			createTiddlyElement(listWrapper, "em", null, null, locale.noTiddlersText);
		} else {
			var listView = ListView.create(listWrapper, publishCandidates, macro.listViewTemplate);
			wizard.setValue("listView", listView);

			var btnHandler = function(ev) {
				macro.makePublic(ev, listWrapper, paramString);
			};
			wizard.setButtons([
				{ caption: locale.makePublicLabel, tooltip: locale.makePublicPrompt, onClick: btnHandler }
			]);
		}

		var publicLinks = $(".viewPublicTiddler");
		$.each(publicLinks, function(index, el) {
			el = $(el);
			var title = el.text();
			el.empty();
			var handler = function(ev) {
				ev.preventDefault();
				var tiddler = store.getTiddler(title);
				config.extensions.tiddlyspace.spawnPublicTiddler(tiddler, el);
			};
			$('<a href="javascript:;" />').text(title).click(handler).appendTo(el);
		});
	}
};

var unpublishedTabText = 'Unpublished "Manage unpublished tiddlers" TabUnpublished';
config.shadowTiddlers.TabMore = config.shadowTiddlers.TabMore.replace(
	"TabMoreShadowed", "TabMoreShadowed %0".format([unpublishedTabText]));
config.shadowTiddlers.TabUnpublished = "<<TiddlySpacePublisher>>";
})(jQuery);
//}}}
