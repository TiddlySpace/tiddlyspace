/***
|''Requires''|TiddlySpaceConfig|
***/
//{{{
config.commands.publishTiddlerRevision = {
	text: "publish",
	tooltip: "Make this revision public",

	isEnabled: function(tiddler) {
		var title = tiddler.title;
		if(store.isShadowTiddler(title) && !store.tiddlerExists(title)) {
			return false;
		}
		var space = this.determineSpace(tiddler);
		return space && space.type == "private";
	},
	handler: function(ev, src, title) {
		var tiddler = store.getTiddler(title);
		var space = this.determineSpace(tiddler);
		// XXX: changes to tiddler object need to be reverted on error!?
		tiddler.fields["server.page.revision"] = "false";
		tiddler.fields["server.workspace"] = "bags/%0_public".format([space.name]);
		var adaptor = tiddler.getAdaptor();
		adaptor.putTiddler(tiddler, null, null, function(context, userParams) {
			story.refreshTiddler(context.tiddler.title, null, true);
		});
	},
	determineSpace: function(tiddler) { // TODO: merge into config.extensions.tiddlyspace.determineSpace
		var bag = tiddler.fields["server.bag"];
		var recipe = tiddler.fields["server.recipe"];
		var container = bag || recipe;
		return container ?
			config.extensions.tiddlyspace.determineSpace(container) : null;
	}
};
//}}}
