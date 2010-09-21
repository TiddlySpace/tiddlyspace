/***
|''Name''|TiddlySpaceConfig|
|''Version''|0.5.5|
|''Description''|TiddlySpace configuration|
|''Status''|@@beta@@|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/raw/master/src/plugins/TiddlySpaceConfig.js|
|''CoreVersion''|2.6.1|
|''Requires''|TiddlyWebConfig ServerSideSavingPlugin|
!Code
***/
//{{{
(function($) {

var tweb = config.extensions.tiddlyweb;

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

// hijack removeTiddlerCallback to restore tiddler from recipe cascade -- TODO: move into TiddlyWebWiki?
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

var coreBags = ["system", "tiddlyspace"];
var systemSpaces = ["plugins", "info", "images", "theme"];
systemSpaces = $.map(systemSpaces, function(item, i) {
	return "system-%0_public".format(item);
});

var plugin = config.extensions.tiddlyspace = {
	currentSpace: determineSpace(recipe),
	coreBags: coreBags.concat(systemSpaces),

	determineSpace: determineSpace,
	isValidSpaceName: function(name) {
		return name.match(/^[a-z][0-9a-z\-]*[0-9a-z]$/) ? true : false;
	},
	// returns the URL for a space's avatar (SiteIcon) based on a server_host
	// object and an optional space name
	// optional nocors argument prevents cross-domain URLs from being generated
	getAvatar: function(host, space, nocors) {
		if(space && typeof space != "string") { // backwards compatibility -- XXX: deprecated
			space = space.name;
		}
		var subdomain = nocors ? plugin.currentSpace.name : space;
		host = host ? this.getHost(host, subdomain) : "";
		var bag = space ? "%0_public".format([space]) : "tiddlyspace";
		return "%0/bags/%1/tiddlers/SiteIcon".format([host, bag]);
	},
	// returns the URL based on a server_host object (scheme, host, port) and an
	// optional subdomain
	getHost: function(host, subdomain) {
		subdomain = subdomain ? subdomain + "." : "";
		var url = "%0://%1%2".format([host.scheme, subdomain, host.host]);
		var port = host.port;
		if(port && !["80", "443"].contains(port)) {
			url += ":" + port;
		}
		return url;
	},
	_disabledTabs: [],
	disableTab: function(tabTiddler) {
		if(typeof(tabTiddler) == "string") {
			plugin._disabledTabs.push(tabTiddler);
		} else {
			for(var i = 0; i < tabTiddler.length; i++) {
				plugin.disableTab(tabTiddler[i]);
			}
		}
	},
	isDisabledTab: function(tabTitle) {
		var match = new RegExp("(?:\\[\\[([^\\]]+)\\]\\])","mg").exec(tabTitle);
		var tabIdentifier = match ? match[1] : tabTitle;
		if(plugin._disabledTabs.contains(tabIdentifier)) {
			return true;
		} else {
			return false;
		}
	}
};

tweb.serverPrefix = tweb.host.split("/")[3] || ""; // XXX: assumes root handler
tweb.getStatus(function(status) {
	var url = plugin.getHost(status.server_host);
	tweb.status.server_host.url = url;
});

// set global read-only mode based on membership heuristics
var indicator = store.getTiddler("SiteTitle") || tiddler;
if(window.location.protocol != "file:") {
	readOnly = !(recipe.split("_").pop() == "private" ||
		tweb.hasPermission("write", indicator));
}

// ensure backstage is always initialized
// required to circumvent TiddlyWiki's read-only based handling
config.macros.backstageInit = {
	init: function() {
		showBackstage = true;
	}
};

// disable evaluated macro parameters for security reasons
var _parseParams = String.prototype.parseParams;
String.prototype.parseParams = function(defaultName, defaultValue, allowEval,
		noNames, cascadeDefaults) {
	arguments[2] = false;
	return _parseParams.apply(this, arguments);
};

var _tabsMacro = config.macros.tabs.handler;
config.macros.tabs.handler = function(place, macroName, params) {
	var newParams = [params[0]]; // keep cookie name
	for(var i = 1; i < params.length; i += 3) {
		var tabTitle = params[i + 2];
		if(!plugin.isDisabledTab(tabTitle)){
			newParams = newParams.concat(params[i], params[i + 1], tabTitle);
		}
	}
	_tabsMacro.apply(this, [place, macroName, newParams]);
};
// register style sheet for backstage separately (important)
store.addNotification("StyleSheetBackstage", refreshStyles);

})(jQuery);
//}}}
