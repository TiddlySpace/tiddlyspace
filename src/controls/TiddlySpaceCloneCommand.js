/***
|''Requires''|TiddlySpaceConfig|
***/
//{{{
(function() {

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
		delete tiddler.fields["server.page.revision"];
		var adaptor = tiddler.getAdaptor();
		adaptor.putTiddler(tiddler, null, null, function(context, userParams) {
			if(context.status) {
				story.refreshTiddler(context.tiddler.title, null, true);
			} else {
				displayMessage(cmd.errorMsg.format([title, context.statusText]));
			}
		});
	}
};

})();
//}}}
