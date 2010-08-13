/***
|''Name''|TiddlySpaceInitialization|
|''Version''|0.5.1|
|''Description''|Initializes new TiddlySpaces the first time they are created|
|''Status''|@@beta@@|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/blob/master/src/plugins/TiddlySpaceInit.js|
|''Requires''|TiddlySpaceConfig RandomColorPalettePlugin|
!Code
***/
//{{{
(function($) {

var macro = config.macros.TiddlySpaceInit = {
	version: "0.1",
	SiteTitle: "%0",
	SiteSubtitle: "a TiddlySpace",
	flagTitle: "%0SetupFlag",
	flagWarning: "Please do not modify this tiddler; it was created " +
		"automatically upon space creation.",

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var space = config.extensions.tiddlyspace.currentSpace;
		var title = this.flagTitle.format([space.name]);
		config.annotations[title] = this.flagWarning;
		if(!store.tiddlerExists(title) && space.type == "private") {
			var tid = new Tiddler(title);
			tid.tags = ["excludeLists", "excludeSearch"];
			tid.fields = $.extend({}, config.defaultCustomFields);
			var versionField = "%0_version".format([macroName]);
			tid.fields[versionField] = this.version;
			tid.text = "@@%0@@".format([this.flagWarning]);
			store.saveTiddler(tid);
			autoSaveChanges(null, [tid]);
			this.dispatch();
		}
	},
	dispatch: function() {
		var space = config.extensions.tiddlyspace.currentSpace;
		var pubWorkspace = "bags/%0_public".format([space.name]);
		// generate Site*itle
		$.each(["SiteTitle", "SiteSubtitle"], function(i, item) {
			var tid = new Tiddler(item);
			tid.tags = ["excludeLists", "excludeSearch"];
			tid.fields = $.extend({}, config.defaultCustomFields, {
				"server.workspace": pubWorkspace
			});
			tid.text = macro[item].format([space.name]);
			tid = store.saveTiddler(tid);
			autoSaveChanges(null, [tid]);
		});
		// generate ColorPalette (ensuring it's public)
		var wfield = "server.workspace";
		var workspace = config.defaultCustomFields[wfield];
		config.defaultCustomFields[wfield] = pubWorkspace;
		config.macros.RandomColorPalette.generatePalette({}, true);
		config.defaultCustomFields[wfield] = workspace;
	}
};

})(jQuery);
//}}}
