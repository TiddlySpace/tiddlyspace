/***
|''Requires''|TiddlySpaceConfig|
***/
//{{{
(function($) {

var ns = config.extensions.tiddlyspace;

var cmd = config.commands.pubRev = { // TODO: rename
	text: "public",
	tooltip: "view public version",
	pubSuffix: " [public]",
	loadingMsg: "retrieving public version of <em>%0</em>",
	noPubError: "<em>%0</em> has not been published",

	isEnabled: function(tiddler) {
		var space = ns.determineSpace(tiddler, false);
		return space && tiddler.fields["server.bag"] == space.name + "_private";
	},
	handler: function(ev, src, title) {
		var tiddler = store.getTiddler(title);
		var adaptor = tiddler.getAdaptor();
		var space = ns.determineSpace(tiddler, false);
		var context = {
			host: adaptor.fullHostName(tiddler.fields["server.host"]),
			workspace: "bags/%0_public".format([space.name])
		};
		var popup = Popup.create(src, "div");
		var msg = cmd.loadingMsg.format([title]);
		popup = $(popup).html(msg);
		Popup.show(); // XXX: can be irritating if it just flashes quickly
		var callback = function(context, userParams) {
			var tid = context.tiddler;
			if(context.status) {
				tid.fields.doNotSave = "true";
				tid.title = tid.title + cmd.pubSuffix;
				store.addTiddler(tid); // overriding existing allows updating
				var refresh = story.getTiddler(tid.title);
				story.displayTiddler(src, tid.title);
				if(refresh) {
					story.refreshTiddler(tid.title, null, true);
				}
				Popup.remove();
			} else {
				var msg = cmd.noPubError.format([tid.title]);
				msg = $('<div class="annotation" />').html(msg);
				popup.empty().append(msg);
			}
		};
		adaptor.getTiddler(title, context, null, callback);
		return false;
	}
};

})(jQuery);
