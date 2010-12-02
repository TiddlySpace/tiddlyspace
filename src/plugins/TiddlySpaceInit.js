/***
|''Name''|TiddlySpaceInitialization|
|''Version''|0.6.8|
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
<link href="/bags/%0_public/tiddlers.atom" rel="alternate"
	type="application/atom+xml" title="%0's public feed" />
<!--}}}-->
!Code
***/
//{{{
(function($) {

var versionField = "tiddlyspaceinit_version";
var markupPreHead = store.getTiddlerText(tiddler.title + "##MarkupPreHead", "");
var tiddlyspace = config.extensions.tiddlyspace;
var currentSpace = tiddlyspace.currentSpace;

var plugin = config.extensions.TiddlySpaceInit = {
	version: "0.5",
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
		var pubWorkspace = tiddlyspace.getCurrentWorkspace("public");
		var existing = store.getTiddler("MarkupPreHead");
		if(!existing || existing.fields["server.workspace"] != pubWorkspace) {
			var tid = new Tiddler("MarkupPreHead");
			tid.text = markupPreHead.format(currentSpace.name);
			tid.tags = ["excludeLists"];
			tid.fields = $.extend({}, config.defaultCustomFields);
			tid.fields["server.workspace"] = pubWorkspace;
			tid.fields["server.page.revision"] = "false";
			tid = store.saveTiddler(tid);
			autoSaveChanges(null, [tid]);
		}
	},
	update: function(curVersion, flagTiddler) {
		if(curVersion < 0.2) {
			this.createAvatar();
		}
		if(curVersion < 0.3) {
			flagTiddler.tags.pushUnique("excludePublisher");
		}
		if(curVersion < 0.5) { // v0.4 was faulty
			this.setupMarkupPreHead();
		}
	},
	firstRun: function() {
		var tiddlers = [];
		var pubTid = {
			tags: ["excludeLists", "excludeSearch"],
			fields: $.extend({}, config.defaultCustomFields, {
				"server.workspace": tiddlyspace.getCurrentWorkspace("public")
			})
		};
		// generate Site*itle
		$.each(["SiteTitle", "SiteSubtitle"], function(i, item) {
			var tid = new Tiddler(item);
			$.extend(tid, pubTid);
			tid.text = plugin[item].format([currentSpace.name]);
			tid = store.saveTiddler(tid);
			tiddlers.push(tid);
		});
		// generate public ColorPalette
		var tid = new Tiddler("ColorPalette");
		$.extend(tid, pubTid);
		tid.text = config.macros.RandomColorPalette.generatePalette({}, true);
		tid = store.saveTiddler(tid);
		tiddlers.push(tid);
		this.createAvatar();
		this.setupMarkupPreHead();
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

		var pubBag = tiddlyspace.getCurrentBag("public");
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
					var uri = "/%0/tiddlers/SiteIcon".
						format(tiddlyspace.getCurrentWorkspace("public"));
					image.refreshImage(uri);
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
