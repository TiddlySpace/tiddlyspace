/***
|''Requires''|TiddlySpaceConfig|
***/
//{{{
config.commands.publishTiddlerRevision = {
	handler: function(ev, src, title) {
		var tiddler = store.getTiddler(title);
		if(tiddler) { // TODO: use isEnabled instead, excluding shadow and non-private tiddlers
			var bag = tiddler.fields["server.bag"];
			var recipe = tiddler.fields["server.recipe"];
			var workspace = tiddler.fields["server.workspace"];
			var container = bag || recipe || workspace.split("/")[1]; // XXX: redundant, yet brittle
			var space = config.extensions.tiddlyspace.determineSpace(container);

			var adaptor = tiddler.getAdaptor();
			delete tiddler.fields["server.page.revision"]; // XXX: not sufficient, as adaptor always generates ETag
			tiddler.fields["server.workspace"] = "bags/%0_public".format([space.name]);
			adaptor.putTiddler(tiddler, null, null, function(context, userParams) {
				story.refreshTiddler(context.tiddler.title, null, true);
			});
		}
	}
};
//}}}
