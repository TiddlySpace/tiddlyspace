/***
|''Name''|TiddlySpaceInitialization|
|''Version''|0.7.2|
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
<link rel="canonical" href="%1/" />
<!--}}}-->
!Code
***/
//{{{
(function($) {

var versionField = "tiddlyspaceinit_version";
var markupPreHead = store.getTiddlerText(tiddler.title + "##MarkupPreHead", "");
var tiddlyspace = config.extensions.tiddlyspace;
var currentSpace = tiddlyspace.currentSpace;
var tweb = config.extensions.tiddlyweb;

var plugin = config.extensions.TiddlySpaceInit = {
	version: "0.6",
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
	update: function(curVersion, flagTiddler) {
		if(curVersion < 0.2) {
			this.createAvatar();
		}
		if(curVersion < 0.3) {
			flagTiddler.tags.pushUnique("excludePublisher"); // XXX: never persisted
		}
		if(curVersion < 0.5) { // v0.4 was faulty
			this.setupMarkupPreHead();
		}
		if(curVersion < 0.6) {
			this.purgeSystemSettings();
		}
	},
	pubTid: {
		tags: ["excludeLists", "excludeSearch"],
		fields: $.extend({}, config.defaultCustomFields, {
			"server.workspace": tiddlyspace.getCurrentWorkspace("public")
		})
	},
	makeTiddlerIfNot: function(tiddler) {
		if (!store.tiddlerExists(tiddler.title)) {
			$.extend(true, tiddler, plugin.pubTid);
			return [store.saveTiddler(tiddler)];
		} else {
			return [];
		}
	},
	firstRun: function() {
		var tiddlers = [];
		// generate Site*itle
		$.each(["SiteTitle", "SiteSubtitle"], function(i, item) {
			var tid = new Tiddler(item);
			tid.text = plugin[item].format([currentSpace.name]);
			tiddlers.push.apply(tiddlers,
				plugin.makeTiddlerIfNot(tid));
		});
		// generate public ColorPalette
		var tid = new Tiddler("ColorPalette");
		tid.text = config.macros.RandomColorPalette.generatePalette({
			saturation_pale: 0.67, saturation_light: 0.53,
			saturation_mid: 0.43, saturation_dark: 0.06,
			pale: 0.99, light: 0.85, mid: 0.5, dark: 0.31
		},
			false);
		tiddlers.push.apply(tiddlers, plugin.makeTiddlerIfNot(tid));
		this.createAvatar();
		this.setupMarkupPreHead();
		return tiddlers;
	},
	// remove _cookie slices (TiddlyWiki 2.6.2 beta 6 remnants)
	purgeSystemSettings: function() {
		var ss = store.getTiddler("SystemSettings");
		if(ss) {
			var lines = ss.text.split("\n");
			var persistentOptions = $.grep(lines, function(line, i) {
				return line.indexOf("_cookie:") == -1;
			});
			ss.text = persistentOptions.join("\n");
			ss = store.saveTiddler(ss);
			autoSaveChanges(null, [ss]);
		}
	},
	createAvatar: function() {
		var avatar = "SiteIcon";
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
	},
	setupMarkupPreHead: function() {
		var pubWorkspace = tiddlyspace.getCurrentWorkspace("public");
		var existing = store.getTiddler("MarkupPreHead");
		if(!existing || existing.fields["server.workspace"] != pubWorkspace) {
			tweb.getStatus(function(status) {
				var tid = new Tiddler("MarkupPreHead");
				tid.text = markupPreHead.format(currentSpace.name, tiddlyspace.getHost(status.server_host,
					currentSpace.name));
				tid.tags = ["excludeLists"];
				tid.fields = $.extend({}, config.defaultCustomFields);
				tid.fields["server.workspace"] = pubWorkspace;
				tid.fields["server.page.revision"] = "false";
				tid = store.saveTiddler(tid);
				autoSaveChanges(null, [tid]);
			});
		}
	}
};

$(document).bind("startup", plugin.dispatch);

})(jQuery);
//}}}
