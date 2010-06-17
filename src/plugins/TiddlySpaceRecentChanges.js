/***
|''Requires''|TiddlySpaceConfig|
***/
//{{{
(function($) {

var plugin = config.extensions.recentChanges = {
	locale: {
		newItems: "%0 new items",
		error: "Error retrieving recent changes - %0: %1"
	},
	containerId: "notificationArea",

	getRecentChanges: function(callback, errback) {
		var host = config.extensions.tiddlyweb.host;
		var currentSpace = config.extensions.tiddlyspace.currentSpace;
		var recipe = "%0_%1".format([currentSpace.name, currentSpace.type]); // XXX: could as well be default workspace!?
		var threshold = this.lastCheck || this.getLastModified();
		var filter = "select=modified:>" + threshold.convertToYYYYMMDDHHMM(); // XXX: correct?
		recipe = new tiddlyweb.Recipe(recipe, host);
		var timestamp = new Date();
		var _callback = function(data, status, xhr) {
			plugin.lastCheck = timestamp;
			callback.apply(this, arguments);
		};
		recipe.tiddlers().get(callback, errback, filter);
	},
	onClick: function(ev) {
		$(this).data("tiddlers"), function(i, item) {
			// TODO: GET tiddler
		}).slideUp();
	},
	callback: function(data, status, xhr) {
		if(data.length) {
			var text = plugin.locale.newItems.format([data.length]);
			notificationArea.text(text).data("tiddlers", data).slideDown();
		}
	},
	errback: function(xhr, error, exc) {
		displayMessage(plugin.locale.error.format([xhr.statusText, xhr.responseText]));
	},
	getLastModified: function() { // TODO: rename -- XXX: obsolete (cf. lastCheck)?
		var tiddlers = store.getTiddlers();
		var sortField = "modified";
		tiddlers.sort(function(a, b) {
			return a[sortField] < b[sortField] ? -1 :
				(a[sortField] == b[sortField] ? 0 : 1);
		});
		while(tiddlers.length) {
			// XXX: too simplistic; someone else might have edited a tiddler before
			var tiddler = tiddlers.pop();
			if(tiddler.fields.changecount === undefined) {
				return tiddler.modified;
			}
		}
	}
};

var notificationArea = $("<div />", { id: plugin.containerId }). // TODO: should be macro?!
	click(plugin.onClick).
	insertAfter("#backstageArea");

plugin.getRecentChanges(plugin.callback, plugin.errback); // TODO: interval

})(jQuery);
//}}}
