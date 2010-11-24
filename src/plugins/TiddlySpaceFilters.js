/***
|''Name''|TiddlySpaceFilters|
|''Description''|provide TiddlySpace-specific filter extensions|
|''Author''|Jon Robson|
|''Version''|0.5.1|
|''Status''|@@beta@@|
|''CoreVersion''|2.6.2|
|''Requires''|TiddlySpaceConfig|
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

var currentSpace = config.extensions.tiddlyspace.currentSpace.name;
var privateBag = "%0_private".format(currentSpace);
var publicBag = "%0_public".format(currentSpace);

config.filterHelpers = {
	is: {
		"private": function(tiddler) {
			var bag = tiddler.fields["server.bag"];
			return bag == privateBag;
		},
		"public": function(tiddler) {
			var bag = tiddler.fields["server.bag"];
			return bag == publicBag;
		},
		draft: function(tiddler) {
			var fields = tiddler.fields;
			var bag = fields["server.bag"];
			return (privateBag == bag && fields["publish.name"]) ? true : false;
		},
		local: function(tiddler) {
			return config.filterHelpers.is["public"](tiddler) ||
				config.filterHelpers.is["private"](tiddler);
		},
		unsynced: function(tiddler) {
			return tiddler ? tiddler.isTouched() : false;
		}
	}
};

config.filters.is = function(results, match) {
	var candidates = store.getTiddlers(null, "excludeLists");
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

})(jQuery);
//}}}
