/***
|''Requires''|TiddlyWebConfig|
***/
//{{{
(function() {

var plugin = config.extensions.tiddlyspace = {
	currentSpace: null,

	determineSpace: function(containerName) {
		var arr = containerName.split("_");
		var type = arr.length > 1 ? arr.pop() : null;
		return ["public", "private"].contains(type) ?
			{ name: arr.join("_"), type: type } : false;
	}
};
var recipe = config.defaultCustomFields["server.workspace"].
	split("recipes/")[1];
plugin.currentSpace = plugin.determineSpace(recipe).name;

})();
//}}}
