/***
|''Requires''|TiddlySpaceConfig|
***/
//{{{
(function() {

var determineSpace = config.extensions.tiddlyspace.determineSpace;

var cmd = config.commands.publishTiddlerRevision = {
	text: "publish",
	tooltip: "Make this revision public",
	errorMsg: "Error publishing %0: %1",

	isEnabled: function(tiddler) {
		var title = tiddler.title;
		if(store.isShadowTiddler(title) && !store.tiddlerExists(title)) {
			return false;
		}
		var space = determineSpace(tiddler);
		return space && space.type == "private";
	},
	handler: function(ev, src, title) {
		var tiddler = store.getTiddler(title);
		var space = determineSpace(tiddler);
		// XXX: changes to tiddler object need to be reverted on error!?
		tiddler.fields["server.workspace"] = "bags/%0_public".format([space.name]);
		tiddler.fields["server.page.revision"] = "false";
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
