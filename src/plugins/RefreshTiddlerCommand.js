/***
|''Name''|RefreshTiddlerCommand|
|''Version''|0.3.0|
***/
//{{{
(function($) {

var cmd = config.commands.refreshTiddler = {
	text: "refresh",
	locale: {
		refreshing: "Refreshing tiddler..."
	},
	tooltip: "refresh this tiddler to be the one on the server",
	handler: function(ev, src, title) {
		var tiddler = store.getTiddler(title);
		if(!tiddler) {
			tiddler = new Tiddler(title);
			merge(tiddler.fields, config.defaultCustomFields);
		}
		$(story.getTiddler(title)).find(".viewer").
			empty().text(cmd.locale.refreshing);
		var dirtyStatus = store.isDirty();
		story.loadMissingTiddler(title, {
			"server.workspace": tiddler.fields["server.recipe"]  ? "recipes/" + tiddler.fields["server.recipe"] :
				tiddler.fields["server.workspace"] || "bags/"+tiddler.fields["server.bag"],
			"server.host": tiddler.fields["server.host"],
			"server.type": tiddler.fields["server.type"]
		}, function() {
			store.setDirty(dirtyStatus);
		});
	}
};

})(jQuery);
//}}}
