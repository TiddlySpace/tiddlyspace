/***
|''Name''|TiddlySpaceInitialization|
|''Version''|0.5.2|
|''Description''|Initializes new TiddlySpaces the first time they are created|
|''Status''|@@beta@@|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/blob/master/src/plugins/TiddlySpaceInit.js|
|''CoreVersion''|2.6.1|
|''Requires''|TiddlySpaceConfig RandomColorPalettePlugin|
!Code
***/
//{{{
(function($) {

var currentSpace = config.extensions.tiddlyspace.currentSpace;

var macro = config.macros.TiddlySpaceInit = {
	version: "0.2",
	SiteTitle: "%0",
	SiteSubtitle: "a TiddlySpace",
	flagTitle: "%0SetupFlag",
	flagWarning: "Please do not modify this tiddler; it was created " +
		"automatically upon space creation.",

	handler: function(place, macroName, params, wikifier, paramString, tiddler) { // XXX: must not be a macro
		var title = this.flagTitle.format([currentSpace.name]);
		config.annotations[title] = this.flagWarning;
		if(currentSpace.type != "private") {
			return;
		}
		var tid = store.getTiddler(title);
		var versionField = "%0_version".format([macroName]).toLowerCase();
		if(tid) {
			curVersion = parseFloat(tid.fields[versionField]);
			reqVersion = parseFloat(this.version);
			if(curVersion < reqVersion) {
				this.update(curVersion);
				tid.fields[versionField] = this.version;
				tid.incChangeCount();
				tid = store.saveTiddler(tid);
				autoSaveChanges(null, [tid]);
			}
		} else { // first run
			tid = new Tiddler(title);
			tid.tags = ["excludeLists", "excludeSearch"];
			tid.fields = $.extend({}, config.defaultCustomFields);
			tid.fields[versionField] = this.version;
			tid.text = "@@%0@@".format([this.flagWarning]);
			tid = store.saveTiddler(tid);
			autoSaveChanges(null, [tid]);
			this.firstRun();
		}
	},
	update: function(curVersion) {
		if(curVersion < 0.2) {
			this.createAvatar();
		}
	},
	firstRun: function() {
		var pubWorkspace = "bags/%0_public".format([currentSpace.name]);
		// generate Site*itle
		$.each(["SiteTitle", "SiteSubtitle"], function(i, item) {
			var tid = new Tiddler(item);
			tid.tags = ["excludeLists", "excludeSearch"];
			tid.fields = $.extend({}, config.defaultCustomFields, {
				"server.workspace": pubWorkspace
			});
			tid.text = macro[item].format([currentSpace.name]);
			tid = store.saveTiddler(tid);
			autoSaveChanges(null, [tid]);
		});
		// generate ColorPalette (ensuring it's public)
		var wfield = "server.workspace";
		var workspace = config.defaultCustomFields[wfield];
		config.defaultCustomFields[wfield] = pubWorkspace;
		config.macros.RandomColorPalette.generatePalette({}, true);
		config.defaultCustomFields[wfield] = workspace;
		// generate avatar
		macro.createAvatar();
	},
	createAvatar: function() {

	}
};

//$(document).bind("startup", plugin.init); // XXX: requires TW 2.6.1

})(jQuery);
//}}}
