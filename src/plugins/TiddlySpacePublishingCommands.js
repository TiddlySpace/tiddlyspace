/***
|''Name''|TiddlySpacePublishingCommands|
|''Version''|0.8.3|
|''Status''|@@beta@@|
|''Description''|toolbar commands for drafting and publishing|
|''Author''|Jon Robson|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/raw/master/src/plugins/TiddlySpacePublishingCommands.js|
|''Requires''|TiddlySpaceConfig|
!Usage
Provides changeToPrivate, changeToPublic and saveDraft commands
Provides TiddlySpacePublisher macro.
{{{<<TiddlySpacePublisher type:private>>}}} make lots of private tiddlers public.
{{{<<TiddlySpacePublisher type:public>>}}} make lots of public tiddlers public.
!TODO
* add public argument?
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
		var privateBag = "%0_private".format(currentSpace);
		var publicBag = "%0_public".format(currentSpace);
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
	copyTiddler: function(title, newTitle, newBag, callback) {
		var original = store.getTiddler(title);
		newTitle = newTitle ? newTitle : title;
		var adaptor = original.getAdaptor();
		var publish = function(original, callback) {
			var tiddler = $.extend(new Tiddler(newTitle), original);
			tiddler.fields = $.extend({}, original.fields, {
				"server.bag": newBag,
				"server.workspace": "bags/%0".format(newBag),
				"server.page.revision": "false"
			});
			delete tiddler.fields["server.title"];
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
		var newWorkspace = "bags/%0".format(newBag);
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
								store.deleteTiddler(oldTitle);
								store.notify(oldTitle, true);
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
			var suggestedTitle = "%0 [draft%1]".format(title, draftNum);
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
		var privateBag = "%0_private".format(currentSpace);
		var privateWorkspace = "bags/%0".format(privateBag);
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
		story.displayTiddler(src, title);
		story.displayTiddler(src, tid.title);
	}
};

var macro = config.macros.TiddlySpacePublisher = {
	locale: {
		title: "Batch Publisher",
		changeStatusLabel: "Make %0",
		noTiddlersText: "No tiddlers to publish",
		changeStatusPrompt: "Make all the selected tiddlers %0.",
		description: "Change tiddlers from %0 to %1 in this space"
	},

	listViewTemplate: {
		columns: [
			{ name: "Selected", field: "Selected", rowName: "title", type: "Selector" },
			{ name: "Tiddler", field: "tiddler", title: "Tiddler", type: "Tiddler" },
			{ name: "Status", field: "status", title: "Status", type: "WikiText" }
		],
		rowClasses: []
	},

	changeStatus: function(tiddlers, status, callback) { // this is what is called when you click the publish button
		var cmd = config.commands.publishTiddler;
		var publicBag;
		for(var i = 0; i < tiddlers.length; i++) {
			var tiddler = tiddlers[i];
			var newTiddler = {
				title: tiddler.title,
				fields: { "server.bag": cmd.toggleBag(tiddler, status) }
			};
			config.commands.publishTiddler.moveTiddler(tiddler, newTiddler, callback);
		}
	},
	getMode: function(paramString) {
		var params = paramString.parseParams("anon")[0];
		var status = params.type ?
			(["public", "private"].contains(params.type[0]) ? params.type[0] : "private") :
			"private";
		var newStatus = status == "public" ? "private" : "public";
		return [status, newStatus];
	},
	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		tiddler = tiddler ? tiddler : store.getTiddlers()[0];
		var wizard = new Wizard();
		var locale = macro.locale;
		var status = macro.getMode(paramString);
		wizard.createWizard(place, locale.title);
		wizard.addStep(macro.locale.description.format(status[0], status[1]),
			'<input type="hidden" name="markList" />');
		var markList = wizard.getElement("markList");
		var listWrapper = $("<div />").addClass("batchPublisher").
			attr("refresh", "macro").attr("macroName", macroName).attr("params", paramString)[0];
		markList.parentNode.insertBefore(listWrapper, markList);
		$.data(listWrapper, "wizard", wizard);
		macro.refresh(listWrapper)
	},
	getCheckedTiddlers: function(listWrapper, titlesOnly) {
		var tiddlers = [];
		$(".chkOptionInput[rowName]:checked", listWrapper).each(function(i, el) {
			var title = $(el).attr("rowName");
			if(titlesOnly) {
				tiddlers.push(title);
			} else {
				tiddlers.push(store.getTiddler(title));
			}
		});
		return tiddlers;
	},
	refresh: function(listWrapper) {
		var checked = macro.getCheckedTiddlers(listWrapper, true);
		var paramString = $(listWrapper).empty().attr("params");
		var wizard = $.data(listWrapper, "wizard");
		var locale = macro.locale;
		var params = paramString.parseParams("anon")[0];
		var publishCandidates = [];
		var tiddlers = params.filter ? store.filterTiddlers(params.filter[0]) : store.getTiddlers("title", "excludePublisher");
		var status = macro.getMode(paramString);
		var fromBag = "%0_%1".format(currentSpace, status[0]);

		// TODO: would be good if filterTiddlers could do the bag checking.
		var enabled = [];
		for(var i = 0; i < tiddlers.length; i++) {
			var tiddler = tiddlers[i];
			var bag = tiddler.fields["server.bag"];
			if(bag == fromBag) {
					publishCandidates.push({ title: tiddler.title, tiddler: tiddler, status: status[0]});
					if(checked.contains(tiddler.title)) {
						enabled.push("[rowname=%0]".format(tiddler.title));
					}
			}
		}

		if(publishCandidates.length === 0) {
			createTiddlyElement(listWrapper, "em", null, null, locale.noTiddlersText);
		} else {
			var listView = ListView.create(listWrapper, publishCandidates, macro.listViewTemplate);
			wizard.setValue("listView", listView);
			var btnHandler = function(ev) {
				var tiddlers = macro.getCheckedTiddlers(listWrapper)
				var callback = function(status) {
					$(".batchPublisher").each(function(i, el) {
						macro.refresh(el);
					});
				};
				macro.changeStatus(tiddlers, status[1], callback);
			};
			wizard.setButtons([{
				caption: locale.changeStatusLabel.format(status[1]),
				tooltip: locale.changeStatusPrompt.format(status[1]),
				onClick: btnHandler
			}]);
			$(enabled.join(",")).attr("checked", true); // retain what was checked before.
		}
	}
};

})(jQuery);
//}}}
