/***
|''Requires''|TiddlySpaceConfig|
***/
//{{{
(function($) {

var cmd = config.commands;
var ns = config.extensions.tiddlyspace;

cmd.cloneTiddler = {
	text: cmd.editTiddler.text,
	tooltip: "Create a copy of this tiddler in the current space",
	errorMsg: "Error publishing %0: %1",

	isEnabled: function(tiddler) {
		var bag = tiddler.fields["server.bag"];
		if(tiddler.isReadOnly()) {
			return false;
		} else if(ns.coreBags.contains(bag)) {
			return true;
		} else {
			var space = ns.determineSpace(tiddler, false);
			return space && space.name != ns.currentSpace.name;
		}
	},
	handler: function(ev, src, title) {
		var tiddler = store.getTiddler(title);
		tiddler.fields["server.workspace"] = "bags/%0_private".
			format([ns.currentSpace.name]);
		$.each(["bag", "permissions", "page.revision"], function(i, item) {
			delete tiddler.fields["server." + item];
		});
		cmd.editTiddler.handler.apply(this, arguments);
		return false;
	}
};

cmd.editTiddler.isEnabled = function(tiddler) {
	return !cmd.cloneTiddler.isEnabled.apply(this, arguments);
};

})(jQuery);
//}}}
