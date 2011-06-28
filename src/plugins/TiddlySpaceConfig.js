/***
|''Name''|TiddlySpaceConfig|
|''Version''|0.7.7|
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
var currentSpace; // assigned later

var disabledTabs = [];

var coreBags = ["system", "tiddlyspace"];
var systemSpaces = ["plugins", "info", "images", "theme"];
systemSpaces = $.map(systemSpaces, function(item, i) {
	return "system-%0_public".format(item);
});

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

var plugin = config.extensions.tiddlyspace = {
	currentSpace: determineSpace(recipe),
	coreBags: coreBags.concat(systemSpaces),

	determineSpace: determineSpace,
	isValidSpaceName: function(name) {
		return name.match(/^[a-z][0-9a-z\-]*[0-9a-z]$/) ? true : false;
	},
	getCurrentBag: function(type) {
		return "%0_%1".format(currentSpace, type);
	},
	getCurrentWorkspace: function(type) {
		return "bags/" + this.getCurrentBag(type);
	},
	// returns the URL for a space's avatar (SiteIcon) based on a server_host
	// object and an optional space name
	// optional nocors argument prevents cross-domain URLs from being generated
	getAvatar: function(host, space, nocors) {
		if(space && typeof space != "string") { // backwards compatibility -- XXX: deprecated
			space = space.name;
		}
		var subdomain = nocors ? currentSpace : space;
		host = host ? this.getHost(host, subdomain) : "";
		var bag = space ? "%0_public".format(space) : "tiddlyspace";
		return "%0/bags/%1/tiddlers/SiteIcon".format(host, bag);
	},
	// returns the URL based on a server_host object (scheme, host, port) and an
	// optional subdomain
	getHost: function(host, subdomain) {
		if(host === undefined) { // offline
			tweb.status.server_host = {}; // prevents exceptions further down the stack -- XXX: hacky workaround, breaks encapsulation
			return null;
		}
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
	getCSRFToken: window.getCSRFToken || null // this may not have been processed yet
};

currentSpace = plugin.currentSpace.name;

tweb.serverPrefix = tweb.host.split("/")[3] || ""; // XXX: assumes root handler
tweb.getStatus(function(status) {
	var url = plugin.getHost(status.server_host);
	tweb.status.server_host.url = url;
	config.messages.tsVersion = status.version;
});

if(window.location.protocol == "file:") {
	// enable AutoSave by default
	config.options.chkAutoSave = config.options.chkAutoSave === undefined ?
		true : config.options.chkAutoSave;
} else {
	// set global read-only mode based on membership heuristics
	var indicator = store.getTiddler("SiteTitle") || tiddler;
	readOnly = !(recipe.split("_").pop() == "private" ||
		tweb.hasPermission("write", indicator));
	// replace TiddlyWiki's ImportTiddlers due to cross-domain restrictions
	if(config.macros.fileImport) {
		$.extend(config.macros.importTiddlers, config.macros.fileImport);
	}
}

// hijack saveChanges to ensure SystemSettings is private by default
var _saveChanges = saveChanges;
saveChanges = function(onlyIfDirty, tiddlers) {
	if(tiddlers && tiddlers.length == 1 &&
			tiddlers[0] && tiddlers[0].title == "SystemSettings") {
		var fields = tiddlers[0].fields;
		delete fields["server.recipe"];
		fields["server.bag"] = plugin.getCurrentBag("private");
		fields["server.workspace"] = plugin.getCurrentWorkspace("private");
	}
	return _saveChanges.apply(this, arguments);
};

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
config.optionsSource.chkPrivateMode = "setting";
config.options.chkPrivateMode = config.options.chkPrivateMode || false;
saveSystemSetting("chkPrivateMode", true);
config.defaultCustomFields["server.workspace"] = plugin.
	getCurrentWorkspace(config.options.chkPrivateMode ? "private" : "public");

config.paramifiers.follow = {
	onstart: function(v) {
		if(!readOnly) {
			var bag = "%0_public".format(currentSpace);
			story.displayTiddler(null, v, DEFAULT_EDIT_TEMPLATE, null, null,
				"server.bag:%0 server.workspace:bags/%0".format(bag));
			story.setTiddlerTag(v, "follow", 1);
			story.focusTiddler(v, "text");
		}
	}
};

var fImport = config.macros.fileImport;
if(fImport) {
	fImport.uploadTo = "Upload to: ";
	var _createForm = config.macros.fileImport.createForm;
	config.macros.fileImport.createForm = function(place, wizard, iframeName) {
		var container = $("<div />").text(fImport.uploadTo).appendTo(place);
		var select = $('<select name="mode" />').appendTo(container)[0];
		$('<option value="private" selected>private</a>').appendTo(select);
		$('<option value="public">public</a>').appendTo(select);
		wizard.setValue("importmode", select);
		_createForm.apply(this, [place, wizard, iframeName]);
	};

	var _onGet = config.macros.importTiddlers.onGetTiddler;
	config.macros.importTiddlers.onGetTiddler = function(context, wizard) {
		var type = $(wizard.getValue("importmode")).val();
		var ws =  plugin.getCurrentWorkspace(type);
		wizard.setValue("workspace", ws);
		_onGet.apply(this, [context, wizard]);
	};
}

})(jQuery);
//}}}
