/***
|''Name''|TiddlySpaceInitialization|
|''Requires''|TiddlySpaceConfig RandomColorPalettePlugin|
***/
//{{{
(function($) {

var macro = config.macros.TiddlySpaceInit = {
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
			store.saveTiddler(tid);
			autoSaveChanges(null, [tid]);
			this.dispatch();
		}
	},
	dispatch: function(args) {
		invokeMacro(null, "RandomColorPalette", "", null, null);
	}
};

})(jQuery);
//}}}
