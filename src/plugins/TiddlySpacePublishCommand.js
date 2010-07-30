/***
|''Name''|TiddlySpacePublishCommand|
|''Version''||
|''Description''|Provides publishing commands for publishing tiddlers in public to private bags|
|''Status''|//unknown//|
|''Source''|http://github.com/TiddlySpace/tiddlyspace|
|''Requires''|TiddlySpaceConfig|
!Code
***/
//{{{
(function($) {

var ns = config.extensions.tiddlyspace;

config.commands.savePublicTiddler = {
	text: "publish",
	tooltip: "Save as public tiddler",

	isEnabled: function(tiddler) {
		return !readOnly && !store.tiddlerExists(tiddler.title);
	},
	handler: function(ev, src, title) {
		var el = story.findContainingTiddler(src);
		el = $(".customFields [edit=server.workspace]", el);
		var workspace = el.val().replace(/_private$/, "_public");
		el.val(workspace);
		config.commands.saveTiddler.handler.apply(this, arguments);
	}
};

var cmd = config.commands.publishTiddlerRevision = {
	text: "publish",
	tooltip: "Make this revision public",
	errorMsg: "Error publishing %0: %1",

	isEnabled: function(tiddler) {
		if(readOnly || !store.tiddlerExists(tiddler.title)) {
			return false;
		}
		var space = ns.determineSpace(tiddler, true);
		return space && space.name == ns.currentSpace.name && space.type == "private";
	},
	handler: function(ev, src, title) {
		var callback = function(context, userParams) {
			if(context.status) {
				ns.spawnPublicTiddler(context.tiddler, src);
			} else {
				displayMessage(cmd.errorMsg.format([title, context.statusText]));
			}
		};
		this.publishTiddler(title, callback);
	},
	publishTiddler: function(title, callback) {
		var original = store.getTiddler(title);
		var space = ns.determineSpace(original);
		var adaptor = original.getAdaptor();
		var publish = function(original, callback) {
			var tiddler = $.extend(new Tiddler(original.title), original);
			tiddler.fields = $.extend({}, original.fields, {
				"server.workspace": "bags/%0_public".format([space.name]),
				"server.page.revision": "false"
			});
			adaptor.putTiddler(tiddler, null, null, callback);
		};
		publish(original, callback);
	}
};

})(jQuery);
//}}}
