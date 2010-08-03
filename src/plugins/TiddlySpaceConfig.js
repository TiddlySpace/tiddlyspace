/***
|''Name''|TiddlySpaceConfig|
|''Version''||
|''Description''|Configures Tiddly(Web)Wiki for use with TiddlySpace|
|''Status''|//unknown//|
|''Source''|http://github.com/TiddlySpace/tiddlyspace|
|''Requires''|TiddlyWebConfig|
!Code
***/
//{{{
(function($) {

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
var sssp = config.extensions.ServerSideSavingPlugin;
var _removeTiddlerCallback = sssp.removeTiddlerCallback;
sssp.removeTiddlerCallback = function(context, userParams) {
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
		t = _saveTiddler.apply(this, [t.title, t.title, t.text, t.modifier,
			t.modified, t.tags, t.fields, false, t.created, t.creator]);
		return t;
	} else {
		return _saveTiddler.apply(this, arguments);
	}
};

var plugin = config.extensions.tiddlyspace = {
	currentSpace: determineSpace(recipe),
	coreBags: ["system", "tiddlyspace"],

	determineSpace: determineSpace,
	isValidSpaceName: function(name) {
		return name.match(/^[a-z][0-9a-z\-]*[0-9a-z]$/) ? true : false;
	},
	getAvatar: function(host, space) {
		host = host ? this.getHost(host) : "";
		var container = {
			type: space.name ? "recipe" : "bag",
			name: space.name ? "%0_public".format([space.name]) : "tiddlyspace"
		};
		return "%0/%1s/%2/tiddlers/SiteIcon".format([host, container.type,
			container.name]);
	},
	getHost: function(host, subdomain) {
		subdomain = subdomain ? subdomain + "." : "";
		var url = "%0://%1%2".format([host.scheme, subdomain, host.host]);
		var port = host.port;
		if(port && !["80", "443"].contains(port)) {
			url += ":" + port;
		}
		return url;
	}
};

var tweb = config.extensions.tiddlyweb;
tweb.serverPrefix = tweb.host.split("/")[3] || ""; // XXX: assumes root handler
tweb.getStatus(function(status) {
	var url = plugin.getHost(status.server_host);
	tweb.status.server_host.url = url;
});

// set global read-only mode based on membership heuristics
var indicator = store.getTiddler("SiteTitle") || tiddler;
readOnly = !(recipe.split("_").pop() == "private" ||
	tweb.hasPermission("write", indicator));

// ensure backstage is always initialized
// required to circumvent TiddlyWiki's read-only based handling
config.macros.backstageInit = {
	init: function() {
		showBackstage = true;
	}
};

// register style sheet for backstage separately (important)
store.addNotification("StyleSheetBackstage", refreshStyles);

})(jQuery);
//}}}
