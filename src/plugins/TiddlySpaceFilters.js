/***
|''Name''|TiddlySpaceFilters|
|''Description''|provide an async list macro and list public, private and draft tiddlers|
|''Author''|Jon Robson|
|''Version''|0.4.4|
|''Status''|@@experimental@@|
|''Requires''|TiddlySpaceConfig ExtensibleFilterPlugin|
|''CodeRepository''|<...>|
|''License''|[[BSD|http://www.opensource.org/licenses/bsd-license.php]]|
!Usage
{{{
<<tsList Private>>
<<tsList Public>>
<<tsList Draft>>
}}}
!Code
***/
//{{{
(function($) {

var ns = config.extensions.tiddlyspace;
var cs = ns.currentSpace.name;
var private_bag = "%0_private".format([cs]);
var public_bag = "%0_public".format([cs]);
config.filterHelpers = {
	is: {
		"private": function(tiddler) {
			var bag = tiddler.fields["server.bag"];
			return bag == private_bag ? true : false;
		},
		"public": function(tiddler) {
			var bag = tiddler.fields["server.bag"];
			return bag == public_bag ? true : false;
		},
		draft: function(tiddler) {
			var fields = tiddler.fields;
			var bag = fields["server.bag"];
			return fields["publish.name"] && private_bag == bag ? true : false;
		},
		local: function(tiddler) {
			return config.filterHelpers.is["public"](tiddler) ||
				config.filterHelpers.is["private"](tiddler);
		}
	}
};
config.filters.is = function(results, match) {
	var candidates =  store.getTiddlers(null, "excludeLists");
	var type = match[3];
	for (var i = 0; i < candidates.length; i++) {
		var tiddler = candidates[i];
		var helper = config.filterHelpers.is[type];
		if(helper && helper(tiddler)) {
			results.pushUnique(tiddler);
		}
	}
	return results;
};

var tsList = config.macros.tsList = { // for backwards compatibility
	handler: function(place, macroName, params) {
		var type = params[0] ? params[0].toLowerCase() : false;
		if(!type) {
			return;
		}
		var filter = "[is[%0]]".format([type]);
		config.macros.list.handler(place, macroName, ["filter", filter]);
	}
};

})(jQuery);
//}}}
