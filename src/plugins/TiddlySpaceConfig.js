/***
|''Name''|TiddlySpaceConfig|
|''Version''|0.6.6|
|''Description''|TiddlySpace configuration|
|''Status''|stable|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/raw/master/src/plugins/TiddlySpaceConfig.js|
|''CoreVersion''|2.6.1|
|''Requires''|TiddlyWebConfig ServerSideSavingPlugin TiddlyFileImporter|
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
				var dirty = store.isDirty();
				store.saveTiddler(context.tiddler).clearChangeCount();
				store.setDirty(dirty);
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
var disabledTabs = [];
var currentSpaceName;
var plugin = config.extensions.tiddlyspace = {
	currentSpace: determineSpace(recipe),
	coreBags: coreBags.concat(systemSpaces),

	determineSpace: determineSpace,
	isValidSpaceName: function(name) {
		return name.match(/^[a-z][0-9a-z\-]*[0-9a-z]$/) ? true : false;
	},
	getCurrentBag: function(type) {
		return "%0_%1".format(currentSpaceName, type);
	},
	getCurrentWorkspace: function(type) {
		return "bags/%0".format(plugin.getCurrentBag(type));
	},
	// returns the URL for a space's avatar (SiteIcon) based on a server_host
	// object and an optional space name
	// optional nocors argument prevents cross-domain URLs from being generated
	getAvatar: function(host, space, nocors) {
		if(space && typeof space != "string") { // backwards compatibility -- XXX: deprecated
			space = space.name;
		}
		var subdomain = nocors ? currentSpaceName : space;
		host = host ? this.getHost(host, subdomain) : "";
		var bag = space ? "%0_public".format(space) : "tiddlyspace";
		return "%0/bags/%1/tiddlers/SiteIcon".format(host, bag);
	},
	// returns the URL based on a server_host object (scheme, host, port) and an
	// optional subdomain
	getHost: function(host, subdomain) {
		subdomain = subdomain ? subdomain + "." : "";
		var url = "%0://%1%2".format(host.scheme, subdomain, host.host);
		var port = host.port;
		if(port && !["80", "443"].contains(port)) {
			url += ":" + port;
		}
		return url;
	},
	disableTab: function(tabTiddler) {
		if(typeof(tabTiddler) == "string") {
			disabledTabs.push(tabTiddler);
		} else {
			for(var i = 0; i < tabTiddler.length; i++) {
				plugin.disableTab(tabTiddler[i]);
			}
		}
	},
	isDisabledTab: function(tabTitle) {
		var match = new RegExp("(?:\\[\\[([^\\]]+)\\]\\])", "mg").exec(tabTitle);
		var tabIdentifier = match ? match[1] : tabTitle;
		return disabledTabs.contains(tabIdentifier);
	},
	getCsrfToken: function() {
		var regex = /^(?:.*; )?csrf_token=([^(;|$)]*)(?:;|$)/;
		var match = regex.exec(document.cookie);
		var csrf_token = null;
		if (match && (match.length === 2)) {
			csrf_token = match[1];
		}

		return csrf_token;
	}
};
currentSpaceName = plugin.currentSpace.name;

tweb.serverPrefix = tweb.host.split("/")[3] || ""; // XXX: assumes root handler
tweb.getStatus(function(status) {
	var url = plugin.getHost(status.server_host);
	tweb.status.server_host.url = url;
	config.messages.tsVersion = status.version;
});

if(window.location.protocol != "file:") {
	// set global read-only mode based on membership heuristics
	var indicator = store.getTiddler("SiteTitle") || tiddler;
	readOnly = !(recipe.split("_").pop() == "private" ||
		tweb.hasPermission("write", indicator));
	// replace TiddlyWiki's ImportTiddlers due to cross-domain restrictions
	if(config.macros.fileImport) {
		$.extend(config.macros.importTiddlers, config.macros.fileImport);
	}
}

// ensure backstage is always initialized
// required to circumvent TiddlyWiki's read-only based handling
config.macros.backstageInit = {
	init: function() {
		showBackstage = true;
	}
};

// disable evaluated macro parameters for security reasons
config.evaluateMacroParameters = "none";
var _parseParams = String.prototype.parseParams;
String.prototype.parseParams = function(defaultName, defaultValue, allowEval,
		noNames, cascadeDefaults) {
	if(config.evaluateMacroParameters == "none") {
		arguments[2] = false;
	}
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

// disable ControlView for XHRs by default
$.ajaxSetup({
	beforeSend: function(xhr) {
		xhr.setRequestHeader("X-ControlView", "false");
	}
});
// TiddlyWeb adaptor currently still uses httpReq, which needs extra magic -- XXX: obsolete this!
var _httpReq = httpReq;
httpReq = function(type, url, callback, params, headers, data, contentType,
		username, password, allowCache) {
	headers = headers || {};
	headers["X-ControlView"] = "false";
	_httpReq.apply(this, arguments);
};

// register style sheet for backstage separately (important)
store.addNotification("StyleSheetBackstage", refreshStyles);

// option for default privacy setting
config.optionsDesc.chkPrivateMode = "Set your default privacy mode to private";
if(config.options.chkPrivateMode === undefined) {
	config.options.chkPrivateMode = false;
	config.defaultCustomFields["server.workspace"] = "bags/%0_public".
		format(currentSpaceName);
} else {
	var mode = config.options.chkPrivateMode ? "private" : "public";
	config.defaultCustomFields["server.workspace"] =  "bags/%0_%1".
		format(currentSpaceName, mode);
}

config.paramifiers.follow = {
	onstart: function(v) {
		if(!readOnly) {
			var bag = "%0_public".format(currentSpaceName);
			story.displayTiddler(null, v, DEFAULT_EDIT_TEMPLATE, null, null,
				"server.bag:%0 server.workspace:bags/%0".format(bag));
			story.setTiddlerTag(v, "follow", 1);
			story.focusTiddler(v, "text");
		}
	}
};

})(jQuery);
//}}}
