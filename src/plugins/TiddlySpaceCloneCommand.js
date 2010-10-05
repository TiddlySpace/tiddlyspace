/***
|''Name''|TiddlySpaceCloneCommand|
|''Version''|0.5.2|
|''Description''|provides a toolbar command for cloning external tiddlers|
|''Status''|stable|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/raw/master/src/plugins/TiddlySpaceCloneCommand.js|
|''Requires''|TiddlySpaceConfig|
!Code
***/
//{{{
(function($) {

var cmd = config.commands;
var ns = config.extensions.tiddlyspace;
var fieldStash = {}; // XXX: should not be private!?

cmd.cloneTiddler = {
	text: cmd.editTiddler.text,
	tooltip: "Create a copy of this tiddler in the current space",
	errorMsg: "Error publishing %0: %1",

	isEnabled: function(tiddler) {
		if(!store.tiddlerExists(tiddler.title)) {
			return true;
		}
		var bag = tiddler.fields["server.bag"];
		if(readOnly) {
			return false;
		} else if(ns.coreBags.contains(bag)) {
			return true;
		} else {
			var space = ns.determineSpace(tiddler, false);
			return space && space.name != ns.currentSpace.name;
		}
	},
	handler: function(ev, src, title) {
		var tiddler = store.getTiddler(title);
		if(tiddler) {
			fieldStash[title] = $.extend({}, tiddler.fields);
			tiddler.fields["server.workspace"] = "bags/%0_private".
				format([ns.currentSpace.name]);
			tiddler.fields["server.permissions"] = "read, write, create"; // no delete
			delete tiddler.fields["server.page.revision"];
			delete tiddler.fields["server.title"];
			delete tiddler.fields["server.etag"];
			// special handling for pseudo-shadow tiddlers
			if(tiddler.fields["server.bag"] == "tiddlyspace") {
				tiddler.tags.remove("excludeLists");
			}
		} else { // ensure workspace is the current space
			var el = story.findContainingTiddler(src);
			el = $(el);
			var fields = el.attr("tiddlyfields");
			if(fields) { // inherited via TiddlyLink
				fields = fields.decodeHashMap();
				fields["server.workspace"] = config.
					defaultCustomFields["server.workspace"];
			} else {
				fields = config.defaultCustomFields;
			}
			fields = String.encodeHashMap(fields);
			el.attr("tiddlyfields", fields);
		}
		cmd.editTiddler.handler.apply(this, arguments);
		tiddler.fields["server.permissions"] += ", delete";
		return false;
	}
};

cmd.editTiddler.isEnabled = function(tiddler) {
	return !cmd.cloneTiddler.isEnabled.apply(this, arguments);
};

// hijack cancelTiddler to restore original fields
var _cancelHandler = cmd.cancelTiddler.handler;
cmd.cancelTiddler.handler = function(ev, src, title) {
	var tiddler = store.getTiddler(title);
	if(tiddler) {
		tiddler.fields = fieldStash[title] || tiddler.fields;
		delete fieldStash[title];
	}
	return _cancelHandler.apply(this, arguments);
};

// hijack saveTiddler to clear unused fields stash
var _saveHandler = cmd.saveTiddler.handler;
cmd.saveTiddler.handler =  function(ev, src, title) {
	delete fieldStash[title];
	return _saveHandler.apply(this, arguments);
};

})(jQuery);
//}}}
