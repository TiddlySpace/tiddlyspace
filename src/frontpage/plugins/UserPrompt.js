//{{{
(function() {

var macro = config.macros.TiddlySpaceUserPrompt = {
	tiddler: "Unknown user",

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		config.extensions.tiddlyweb.getUserInfo(function(user) {
			if(!user.anon) {
				story.displayTiddler(document.body, macro.tiddler);
			}
		});
	}
};

})();
//}}}
