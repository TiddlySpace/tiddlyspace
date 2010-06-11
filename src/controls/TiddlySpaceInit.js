/***
|''Name''|TiddlySpaceInitialization|
|''Requires''|TiddlySpaceConfig RandomColorPalettePlugin|
***/
//{{{
(function($) {

var macro = config.macros.TiddlySpaceInit = {
	version: "0.1",
	SiteTitle: "%0",
	SiteSubtitle: "a TiddlySpace",
	flagTitle: "_init_%0", // XXX: rename variable and tiddler
	flagWarning: "Please do not modify this tiddler; it was created " +
		"automatically to indicate initialization status.",

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
			store.saveTiddler(tid);
			var autoSave = config.options.chkAutoSave;
			config.options.chkAutoSave = false;
			this.dispatch();
			config.options.chkAutoSave = autoSave;
			autoSaveChanges();
		}
	},
	dispatch: function() {
		// generate Site*itle
		var space = config.extensions.tiddlyspace.currentSpace;
		$.each(["SiteTitle", "SiteSubtitle"], function(i, item) {
			var tid = new Tiddler(item);
			tid.tags = ["excludeLists", "excludeSearch"];
			tid.fields = $.extend({}, config.defaultCustomFields, {
				"server.workspace": "bags/%0_public".format([space.name])
			});
			tid.text = macro[item].format([space.name]);
			store.saveTiddler(tid);
		});
		// generate ColorPalette
		invokeMacro(null, "RandomColorPalette", "", null, null);
	}
};

})(jQuery);
//}}}
