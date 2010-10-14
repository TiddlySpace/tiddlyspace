/***
|''Name''|FilterFieldsListPlugin|
|''Requires''|TiddlySpaceConfig|
|''Version''|0.8.0|
|''License''|[[BSD|http://www.opensource.org/licenses/bsd-license.php]]|
!Usage
{{{<<list filterfield foo bar bar !hello>>}}} gives you a list of all tiddlers where field foo = bar and field bar != hello
$$ in TiddlySpace can be used for the current space name.
!Code
***/
//{{{
(function($) {
var ns = config.extensions.tiddlyspace;

var macro = config.macros.list.filterfield = {
	replaceString: ns.currentSpace.name,
	handler: function(params) {
		var filters = macro.getFilters(params);
		return filters.length > 0 ? macro.filter(store.getTiddlers("title", "excludeLists"), filters) : [];
	},
	getFilters: function(params) {
		var filters = [];
		for(var i = 1; i < params.length; i+=2) {
			var field = params[i];
			var val = params[i+1];
			val = val ? val.replace("$$", macro.replaceString) : false;
			filters.push([field, val]);
		}
		return filters;
	},
	compareValues: function(val1, val2) {
		if(typeof(val1) == "string" && val1.indexOf("!") === 0) {
			val1 = val1.substr(1);
			return val1 !== val2;
		} else {
			return val1 == val2;
		}
	},
	filter: function(tiddlers, filters) {
		var filtered = [];
		for(var i = 0; i < tiddlers.length; i++) {
			var tiddler = tiddlers[i];
			var match = true;
			for(var j = 0; j < filters.length; j++) {
				var field = filters[j][0];
				var requiredValue = filters[j][1];
				var negationMode;
				if(field.indexOf("!") === 0) {
					negationMode = true;
					field = field.substr(1);
				} else {
					negationMode = false;
				}
				var tidValue = tiddler.fields[field];
				if(match) {
					if(!requiredValue) {
						if(!negationMode && field && tidValue) { // tiddler has field as required
							match = true;
						} else if(negationMode && field && !tidValue) { // check field absent
							match = true;
						} else {
							match = false;
						}
					} else {
						match = macro.compareValues(requiredValue, tidValue);
					}
				}
			}
			if(match) {
				filtered.push(tiddler);
			}
		}
		return filtered;
	}
};
})(jQuery);
//}}}
