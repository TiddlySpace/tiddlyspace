/***
|''Requires''|TiddlyWebConfig|
***/
//{{{
(function() {

var recipe = config.defaultCustomFields["server.workspace"].split("recipes/")[1];

var determineSpace = function(containerName) {
	var arr = containerName.split("_");
	var type = arr.length > 1 ? arr.pop() : null;
	return ["public", "private"].contains(type) ?
		{ name: arr.join("_"), type: type } : false;
};

var plugin = config.extensions.tiddlyspace = {
	currentSpace: determineSpace(recipe).name,
	determineSpace: determineSpace
};

})();
//}}}
