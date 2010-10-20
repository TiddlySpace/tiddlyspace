/***
|''Name''|TiddlySpaceInitialization|
|''Version''|0.6.5|
|''Description''|Initializes new TiddlySpaces the first time they are created|
|''Status''|@@beta@@|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/blob/master/src/plugins/TiddlySpaceInit.js|
|''CoreVersion''|2.6.1|
|''Requires''|TiddlySpaceConfig RandomColorPalettePlugin chrjs ImageMacroPlugin|
!TODO
* robust error notification and recovery
!MarkupPreHead
<!--{{{-->
<link rel="shortcut icon" href="/recipes/%0_public/tiddlers/favicon.ico" />
<link href="/bags/%0_public/tiddlers.atom?select=tag:!excludeLists" rel="alternate" type="application/rss+xml" title="%0\'s public feed"/>
<!--}}}-->
!Code
***/
//{{{
(function($) {

var versionField = "tiddlyspaceinit_version";
var markupPreHead = store.getTiddlerText(tiddler.title + "##MarkupPreHead") || "";
var currentSpace = config.extensions.tiddlyspace.currentSpace;

var plugin = config.extensions.TiddlySpaceInit = {
	version: "0.4",
	SiteTitle: "%0",
	SiteSubtitle: "a TiddlySpace",
	flagTitle: "%0SetupFlag",
	flagWarning: "Please do not modify this tiddler; it was created " +
		"automatically upon space creation.",

	dispatch: function(ev) {
		var title = plugin.flagTitle.format([currentSpace.name]);
		config.annotations[title] = plugin.flagWarning;
		if(currentSpace.type != "private") {
			return;
		}
		var tiddlers = [];
		var tid = store.getTiddler(title);
		if(tid) {
			curVersion = parseFloat(tid.fields[versionField]);
			reqVersion = parseFloat(plugin.version);
			if(curVersion < reqVersion) {
				plugin.update(curVersion, tid);
				tid.fields[versionField] = plugin.version;
				tid.incChangeCount();
				tid = store.saveTiddler(tid);
				tiddlers.push(tid);
			}
		} else { // first run
			tid = new Tiddler(title);
			tid.tags = ["excludeLists", "excludeSearch", "excludePublisher"];
			tid.fields = $.extend({}, config.defaultCustomFields);
			tid.fields[versionField] = plugin.version;
			tid.text = "@@%0@@".format([plugin.flagWarning]);
			tid = store.saveTiddler(tid);
			tiddlers = tiddlers.concat(plugin.firstRun(), tid);
		}
		autoSaveChanges(null, tiddlers);
	},
	setupMarkupPreHead: function() {
		var pubWorkspace = plugin.getPublicWorkspace();
		var existing = store.getTiddler("MarkupPreHead");
		if(!existing || existing.fields["server.workspace"] != pubWorkspace) {
			var prehead = new Tiddler("MarkupPreHead");
			prehead.fields = $.extend({}, config.defaultCustomFields);
			prehead.fields["server.workspace"] = pubWorkspace;
			prehead.text = markupPreHead.format([currentSpace.name]);
			prehead.fields["server.page.revision"] = "false";
			prehead = store.saveTiddler(prehead);
			autoSaveChanges(null, [prehead]);
		}
	},
	update: function(curVersion, flagTiddler) {
		if(curVersion < 0.2) {
			this.createAvatar();
		}
		if(curVersion < 0.3) {
			flagTiddler.tags.pushUnique("excludePublisher");
		}
		if(curVersion < 0.4) {
			this.setupMarkupPreHead();
		}
	},
	firstRun: function() {
		var tiddlers = [];
		var pubWorkspace = plugin.getPublicWorkspace();
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
		this.setupMarkupPreHead();
		return tiddlers;
	},
	getPublicWorkspace: function() {
		return "bags/%0".format([plugin.getPublicBag()]);
	},
	getPublicBag: function() {
		var pubBag = currentSpace.name + "_public";
		return pubBag;
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

		var pubBag = plugin.getPublicBag();
		var tid = new tiddlyweb.Tiddler(avatar);
		tid.bag = new tiddlyweb.Bag(pubBag, host);

		var callback = function(data, status, xhr) {}; // avatar already exists; do nothing
		var errback = function(xhr, error, exc) {
			if(xhr.status != 404) {
				return;
			}
			// copy default avatar
			var _notify = function(tid, status, xhr) {
				displayMessage("created avatar"); // TODO: i18n
				var image = config.macros.image;
				if(image && image.refreshImage) {
					image.refreshImage("/bags/%0_public/tiddlers/SiteIcon".format([currentSpace.name]));
					image.refreshImage("SiteIcon");
				}
			};
			var _callback = function(tid, status, xhr) {
				tid.title = avatar;
				tid.bag.name = pubBag;
				delete tid.etag;
				tid.put(_notify, notify); // TODO: add to current session document (via adaptor?)
			};
			tweb.getUserInfo(function(user) {
				var avatarTitle = currentSpace.name == user.name ?
					"defaultUserIcon" : "defaultSiteIcon";
				var tid = new tiddlyweb.Tiddler(avatarTitle);
				tid.bag = new tiddlyweb.Bag("common", host);
				tid.get(_callback, notify);
			});
		};
		tid.get(callback, errback);
	}
};

$(document).bind("startup", plugin.dispatch);

})(jQuery);
//}}}
