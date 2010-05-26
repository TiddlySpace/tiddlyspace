/***
|''Name''|TiddlySpaceConfig|
|''Requires''|TiddlyWebConfig|
***/
//{{{
(function() {

var recipe = config.defaultCustomFields["server.workspace"].split("recipes/")[1];

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
	currentSpace: determineSpace(recipe).name,
	determineSpace: determineSpace
};

var ns = config.extensions.tiddlyweb;
ns.serverPrefix = ns.host.split("/")[3] || ""; // XXX: assumes root handler

config.shadowTiddlers.ToolbarCommands = config.shadowTiddlers.ToolbarCommands.
	replace("editTiddler ", "editTiddler cloneTiddler ").
	replace("revisions ", "publishTiddlerRevision revisions ");

})();
//}}}
