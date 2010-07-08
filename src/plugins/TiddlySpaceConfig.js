/***
|''Name''|TiddlySpaceConfig|
|''Requires''|TiddlyWebConfig|
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
		var t = $.extend(new Tiddler(title.title), title);
		_saveTiddler.apply(this, [t.title, t.title, t.text, t.modifier,
			t.modified, t.tags, t.fields, false, t.created, t.creator]);
	} else {
		_saveTiddler.apply(this, arguments);
	}
};

var plugin = config.extensions.tiddlyspace = {
	currentSpace: determineSpace(recipe),
	coreBags: ["system", "tiddlyspace"],

	determineSpace: determineSpace,
	isValidSpaceName: function(name) {
		return name.match(/^[a-z][0-9a-z\-]*[0-9a-z]$/) ? true : false;
	}
};

ns = config.extensions.tiddlyweb;
ns.serverPrefix = ns.host.split("/")[3] || ""; // XXX: assumes root handler

config.shadowTiddlers.ToolbarCommands = config.shadowTiddlers.ToolbarCommands.
	replace("editTiddler ", "editTiddler cloneTiddler ").
	replace("closeOthers", "").replace("jump", "jump closeOthers").
	replace("revisions ", "publishTiddlerRevision pubRev revisions ").
	replace("saveTiddler ", "saveTiddler savePublicTiddler ");

// set global read-only mode depending on space membership
readOnly = true;
ns.getUserInfo(function(user) {
	var callback = function(members, status, xhr) {
		readOnly = !members.contains(ns.username);
		var anim = config.options.chkAnimate;
		config.options.chkAnimate = false;
		refreshDisplay();
		config.options.chkAnimate = anim;
	};
	var errback = function(xhr, error, exc) {}; // assumes read-only
	if(!user.anon) {
		var space = new tiddlyweb.Space(plugin.currentSpace.name, ns.host);
		space.members().get(callback, errback);
	}
});

// ensure backstage is always initialized
// required to circumvent TiddlyWiki's read-only based handling
config.macros.backstageInit = {
	init: function() {
		showBackstage = true;
	}
};

// register style sheet
store.addNotification("StyleSheetTiddlySpace", refreshStyles);

})(jQuery);
//}}}
