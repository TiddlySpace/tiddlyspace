/***
|''Requires''|TiddlySpaceConfig|
***/
//{{{
(function($) {

var ns = config.extensions.tiddlyspace;

var cmd = config.commands.publishTiddlerRevision = {
	text: "publish",
	tooltip: "Make this revision public",
	errorMsg: "Error publishing %0: %1",

	isEnabled: function(tiddler) {
		var title = tiddler.title;
		if(store.isShadowTiddler(title) && !store.tiddlerExists(title)) {
			return false;
		}
		var space = ns.determineSpace(tiddler, true);
		return space && space.name == ns.currentSpace.name && space.type == "private";
	},
	handler: function(ev, src, title) {
		var original = store.getTiddler(title);
		var space = ns.determineSpace(original);
		var tiddler = $.extend(new Tiddler(title), original);
		tiddler.fields = $.extend({}, original.fields, {
			"server.workspace": "bags/%0_public".format([space.name]),
			"server.page.revision": "false"
		});
		var adaptor = tiddler.getAdaptor();
		adaptor.putTiddler(tiddler, null, null, function(context, userParams) {
			if(context.status) {
				ns.spawnPublicTiddler(context.tiddler, src);
			} else {
				displayMessage(cmd.errorMsg.format([title, context.statusText]));
			}
		});
	}
};

})(jQuery);
//}}}
