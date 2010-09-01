/***
|''Name''|TiddlySpaceInitialization|
|''Version''|0.6.1|
|''Description''|Initializes new TiddlySpaces the first time they are created|
|''Status''|@@beta@@|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/blob/master/src/plugins/TiddlySpaceInit.js|
|''CoreVersion''|2.6.1|
|''Requires''|TiddlySpaceConfig RandomColorPalettePlugin chrjs|
!TODO
* robust error notification and recovery
!Code
***/
//{{{
(function($) {

var versionField = "tiddlyspaceinit_version";

var currentSpace = config.extensions.tiddlyspace.currentSpace;

var plugin = config.extensions.TiddlySpaceInit = {
	version: "0.2",
	SiteTitle: "%0",
	SiteSubtitle: "a TiddlySpace",
	flagTitle: "%0SetupFlag",
	flagWarning: "Please do not modify this tiddler; it was created " +
		"automatically upon space creation.",

	dispatch: function() {
		var title = plugin.flagTitle.format([currentSpace.name]);
		config.annotations[title] = this.flagWarning;
		if(currentSpace.type != "private") {
			return;
		}
		var tiddlers = [];
		var tid = store.getTiddler(title);
		if(tid) {
			curVersion = parseFloat(tid.fields[versionField]);
			reqVersion = parseFloat(plugin.version);
			if(curVersion < reqVersion) {
				plugin.update(curVersion);
				tid.fields[versionField] = plugin.version;
				tid.incChangeCount();
				tid = store.saveTiddler(tid);
				tiddlers.push(tid);
			}
		} else { // first run
			tid = new Tiddler(title);
			tid.tags = ["excludeLists", "excludeSearch"];
			tid.fields = $.extend({}, config.defaultCustomFields);
			tid.fields[versionField] = plugin.version;
			tid.text = "@@%0@@".format([plugin.flagWarning]);
			tid = store.saveTiddler(tid);
			tiddlers = tiddlers.concat(plugin.firstRun(), tid);
		}
		autoSaveChanges(null, tiddlers);
	},
	update: function(curVersion) {
		if(curVersion < 0.2) {
			this.createAvatar();
		}
	},
	firstRun: function() {
		var tiddlers = [];
		var pubWorkspace = "bags/%0_public".format([currentSpace.name]);
		// generate Site*itle
		$.each(["SiteTitle", "SiteSubtitle"], function(i, item) {
			var tid = new Tiddler(item);
			tid.tags = ["excludeLists", "excludeSearch"];
			tid.fields = $.extend({}, config.defaultCustomFields, {
				"server.workspace": pubWorkspace
			});
			tid.text = plugin[item].format([currentSpace.name]);
			tid = store.saveTiddler(tid);
			tiddlers.push(tid);
		});
		// generate ColorPalette (ensuring it's public)
		var wfield = "server.workspace";
		var workspace = config.defaultCustomFields[wfield];
		config.defaultCustomFields[wfield] = pubWorkspace; // XXX: hacky
		config.macros.RandomColorPalette.generatePalette({}, true);
		config.defaultCustomFields[wfield] = workspace;
		// generate avatar
		this.createAvatar();
		return tiddlers;
	},
	createAvatar: function() {
		var avatar = "SiteIcon";
		var tweb = config.extensions.tiddlyweb;
		var host = tweb.host;
		var notify = function(xhr, error, exc) {
			displayMessage("ERROR: could not create avatar - " + // TODO: i18n
				"%0: %1".format([xhr.statusText, xhr.responseText]));
			// TODO: resolve!?
		};

		var pubBag = currentSpace.name + "_public";
		var tid = new tiddlyweb.Tiddler(avatar);
		tid.bag = new tiddlyweb.Bag(pubBag, host);

		var callback = function(data, status, xhr) {}; // avatar already exists; do nothing
		var errback = function(xhr, error, exc) {
			// copy default avatar -- XXX: assumes error cause was 404
			tweb.getUserInfo(function(user) {
				var avatarTitle = currentSpace.name == user.name ? "defaultUserIcon" : "defaultSiteIcon"; 
				var tid = new tiddlyweb.Tiddler(avatarTitle);
				tid.bag = new tiddlyweb.Bag("common", host);
				var _notify = function(tid, status, xhr) {
					displayMessage("created avatar"); // TODO: i18n
				};
				var _callback = function(tid, status, xhr) {
					tid.title = avatar;
					tid.bag.name = pubBag;
					tid.put(_notify, notify); // TODO: add to current session document (via adaptor?)
				};
				tid.get(_callback, notify);
			});
		};
		tid.get(callback, errback);
	}
};

$(document).bind("startup", plugin.dispatch);

})(jQuery);
//}}}
