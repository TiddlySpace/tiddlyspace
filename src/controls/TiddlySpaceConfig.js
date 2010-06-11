/***
|''Name''|TiddlySpaceConfig|
|''Requires''|TiddlyWebConfig RandomColorPalettePlugin|
***/
//{{{
(function($) {

var ns;
var recipe = config.defaultCustomFields["server.workspace"].split("recipes/")[1];

// hijack search macro to add custom attributes for mobile devices
var _search = config.macros.search.handler;
config.macros.search.handler = function(place, macroName, params) {
	_search.apply(this, arguments);
	$(".searchField:input", place).
		attr({ autocapitalize: "off", autocorrect: "off" });
};

// arg is either a container name or a tiddler object
// if fuzzy is truthy, space may be inferred from workspace (for new tiddlers)
// returns space object or false
var determineSpace = function(arg, fuzzy) {
	if(typeof arg == "string") { // container name
		var space = split(arg, "_", "r");
		return ["public", "private"].contains(space.type) ? space : false;
	} else if(arg) { // tiddler
		var container = determineContainer(arg, fuzzy);
		return container ? determineSpace(container.name, fuzzy) : false;
	} else {
		return false;
	}
};

// if fuzzy is truthy, container may be inferred from workspace for new tiddlers
// returns container object or false
var determineContainer = function(tiddler, fuzzy) { // TODO: expose?
	var bag = tiddler.fields["server.bag"];
	var recipe = tiddler.fields["server.recipe"]; // XXX: unused/irrelevant/redundant!?
	if(bag) {
		return { type: "bag", name: bag };
	} else if(recipe) {
		return { type: "recipe", name: recipe };
	} else if(fuzzy) { // new tiddler
		var workspace = tiddler.fields["server.workspace"];
		if(workspace) {
			var container = split(workspace, "/", "l");
			return ["bags", "recipes"].contains(container.type) ? container : false;
		} else {
			return false;
		}
	} else {
		return false;
	}
};

// hijack removeTiddlerCallback to restore tiddler from recipe cascade
ns = config.extensions.ServerSideSavingPlugin;
var _removeTiddlerCallback = ns.removeTiddlerCallback;
ns.removeTiddlerCallback = function(context, userParams) {
	var title = context.tiddler.title;
	var recipe = context.tiddler.fields["server.recipe"];
	_removeTiddlerCallback.apply(this, arguments);
	if(recipe) {
		context.workspace = "recipes/" + recipe;
		var callback = function(context, userParams) {
			if(context.status) {
				store.saveTiddler(context.tiddler);
			} else {
				store.notify(title, true);
			}
		};
		context.adaptor.getTiddler(title, context, null, callback);
	}
};

// splits a string once using delimiter
// mode "l" splits at the first, "r" at the last occurrence
// returns an object with members type and name
var split = function(str, sep, mode) {
	mode = mode == "r" ? "pop" : "shift"; // TODO: use +/-1 instead of "l"/"r"?
	var arr = str.split(sep);
	var type = arr.length > 1 ? arr[mode]() : null;
	return { type: type, name: arr.join(sep) };
};

// hijack saveTiddler to accept Tiddler instance
var _saveTiddler = TiddlyWiki.prototype.saveTiddler;
TiddlyWiki.prototype.saveTiddler = function(title, newTitle, newBody, modifier,
		modified, tags, fields, clearChangeCount, created, creator) {
	if(title instanceof Tiddler) { // overloading first argument
		var t = $.extend({}, title);
		t.fields = $.extend({}, title.fields);
		_saveTiddler.apply(this, [t.title, t.title, t.text, t.modifier,
			t.modified, t.tags, t.fields, false, t.created, t.creator]);
	} else {
		_saveTiddler.apply(this, arguments);
	}
};

var plugin = config.extensions.tiddlyspace = {
	currentSpace: determineSpace(recipe),
	determineSpace: determineSpace,
	firstRunTiddler: {
		title: "TiddlySpace",
		text: "This TiddlySpace was created lovingly at %0 on behalf of %1.",
		annotation: "This tiddler is used as part of the TiddlySpace setup. Deleting this tiddler may have unexpected consequences on your TiddlySpace"
	},
	setup: function(){
		var firstRunTiddler = config.extensions.tiddlyspace.firstRunTiddler;
		config.annotations[firstRunTiddler.title] = firstRunTiddler.annotation;
		var space= store.getTiddler(firstRunTiddler.title);
		if(!space && !readOnly){ //in private mode and have not setup yet so setup
				var tid = new Tiddler(firstRunTiddler.title);
				tid.tags = ['excludeLists','excludeSearch']; //make it hard for accidential deletions

				var text = firstRunTiddler.text;
				text = text.replace("%0",tid.modified.formatString(config.views.wikified.dateFormat));
				text = text.replace("%1",config.options.txtUserName);
				tid.text = text;

				//record this activity so it doesn't happen again.
				store.saveTiddler(tid.title,tid.title, tid.text, tid.modifier,tid.modified,tid.tags,merge(tid.fields,config.defaultCustomFields),false,tid.created,'');
				saveChanges();

				//perform initialisation of space here
				config.macros.RandomColorPalette.handler();
		}
	}
};
ns = config.extensions.tiddlyweb;
ns.serverPrefix = ns.host.split("/")[3] || ""; // XXX: assumes root handler

var shadows = config.shadowTiddlers;
shadows.WindowTitle = "[%0] %1".format([plugin.currentSpace.name, shadows.WindowTitle]);

var _restart = restart;
restart = function(){
	_restart();
	plugin.setup(); //initialize the tiddlyspace if needed
}
})(jQuery);
//}}}
