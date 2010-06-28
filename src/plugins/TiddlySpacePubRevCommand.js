/***
|''Requires''|TiddlySpaceConfig|
***/
//{{{
(function($) {

var ns = config.extensions.tiddlyspace;

var cmd = config.commands.pubRev = { // TODO: rename
	text: "public",
	tooltip: "view public version",
	loadingMsg: "retrieving public version of <em>%0</em>",
	noPubError: "<em>%0</em> has not been published",

	isEnabled: function(tiddler) {
		if(tiddler.isReadOnly()) {
			return false;
		}
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
			if(context.status) {
				ns.spawnPublicTiddler(context.tiddler, src);
				Popup.remove();
			} else {
				var msg = cmd.noPubError.format([context.tiddler.title]);
				msg = $('<div class="annotation" />').html(msg);
				popup.empty().append(msg);
			}
		};
		adaptor.getTiddler(title, context, null, callback);
		return false;
	}
};

// adds a Tiddler instance to the store as temporary tiddler and displays it
// src is passed to Story's displayTiddler as srcElement
ns.spawnPublicTiddler = function(tiddler, src) { // XXX: rename!?
	tiddler.fields.doNotSave = "true";
	tiddler.title = tiddler.title + this.spawnPublicTiddler.pubSuffix;
	store.addTiddler(tiddler); // overriding existing allows updating
	var refresh = story.getTiddler(tiddler.title);
	var el = story.displayTiddler(src || null, tiddler.title);
	if(refresh) {
		story.refreshTiddler(tiddler.title, null, true);
	}
	return el;
};
ns.spawnPublicTiddler.pubSuffix = " [public]"; // XXX: hacky?

// hijack ServerSideSavingPlugin's sync to support virtual public tiddlers
var _sync = config.extensions.ServerSideSavingPlugin.sync;
config.extensions.ServerSideSavingPlugin.sync = function(tiddlers) {
	_sync.apply(this, arguments);
	store.forEachTiddler(function(title, tiddler) {
		if(tiddler.fields.doNotSave == "true" &&
				endsWith(title, ns.spawnPublicTiddler.pubSuffix)) {
			tid = $.extend(new Tiddler(title), tiddler);
			tid.fields = $.extend({}, tiddler.fields);
			tid.title = tid.fields["server.title"];
			delete tid.fields.doNotSave;
			delete tid.fields["server.title"];
			config.extensions.ServerSideSavingPlugin.saveTiddler(tid);
		}
	});
};

var endsWith = function(str, suffix) {
	return str.length >= suffix.length &&
		str.substr(str.length - suffix.length) == suffix;
};

})(jQuery);
//}}}
