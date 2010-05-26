/***
|''Requires''|TiddlySpaceConfig|
***/
//{{{
(function($) {

var ns = config.extensions.tiddlyspace;

var cmd = config.commands.cloneTiddler = {
	text: "clone",
	tooltip: "Create a copy of this tiddler in the current space",
	errorMsg: "Error publishing %0: %1",

	isEnabled: function(tiddler) {
		var space = ns.determineSpace(tiddler, false);
		return space && space.name != ns.currentSpace;
	},
	handler: function(ev, src, title) {
		var tiddler = store.getTiddler(title);
		tiddler.fields["server.workspace"] = "bags/%0_private".format([ns.currentSpace]);
		$.each(["bag", "recipe", "permissions", "page.revision"], function(i, item) {
			delete tiddler.fields["server." + item];
		});
		config.commands.editTiddler.handler.apply(this, arguments);
		return false;
	}
};

})(jQuery);
//}}}
