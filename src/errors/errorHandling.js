/***
|''Name''|TiddlySpaceErrorHandlers|
|''Description''|Provides useful functionality for a given error message|
***/
//{{{
var errorhandler = {
	locale: {
		errorCreateSpace: "error creating space.",
		tiddlerSuggestionsHeader: "Were you looking for one of these tiddlers...?",
		spaceSuggestionsHeader: "Were you looking for one of these spaces...?",
		claimSpace: "create space with this name",
		alternativeTiddlers: "looking for alternative tiddlers...",
		alternativeSpaces: "looking for alternative spaces...",
		creatingLink: "creating space link..."
	},

	init: function(status) {
		if(errorhandler.handlers[status]) {
			errorhandler.handlers[status]();
		}
	},
	handlers: {
		404: function() {
			var domain = window.location.host.split(".");
			var path = window.location.pathname.substr(1, window.location.pathname.length); // remove first "/"
			var space = domain[0];
			var container = $(".spaceSuggestions")[0];
			if(path) {
				var segments = path.split("/");
				tiddler = segments[segments.length - 1];
				if(segments.length === 1 || tiddler.length === 4) { // currently only for for tiddler uris
					errorhandler.suggestTiddlers(container, space, path);
				}
			} else {
				errorhandler.createSpaceLink($(".claim-space"), space);
				errorhandler.suggestSpaces(container, space);
			}
		}
	},
	createSpaceLink: function (container, name) {
		$(container).empty(errorhandler.locale.creatingLink);
		$.ajax({url: "/status", dataType: "json",
			success: function(status) {
				if(status.username && status.username != "GUEST") {
					var sh = status["server_host"];
					var newSpaceUri = sh.scheme + "://" + name + "." + sh.host;
					newSpaceUri = sh.port ? newSpaceUri + ":" + sh.port : newSpaceUri;
					var spaceCallback = function() {
						window.location = newSpaceUri;
					};
					$(container).empty();
					$("<input />").attr("type", "button").val(errorhandler.locale.claimSpace).click(function(ev) {
						var host = window.location.protocol + "//" + window.location.host;
						var space = new tiddlyweb.Space(name, host);
						space.create(spaceCallback, function() {
							alert(errorhandler.locale.errorCreateSpace);
						});
						ev.preventDefault();
					}).appendTo(container);
				}
			}
		});
	},
	areSimilar: function(x, y) {
		// TO DO: apply soundex algorithm?
		if(!x || !y) {
			return false;
		} else if(x.indexOf(y) > -1) {
			return true;
		} else if(y.indexOf(x) > -1) {
			return true;
		} else {
			return false;
		}
	},
	suggestTiddlers: function(container, space, title) {
		$(container).empty(errorhandler.locale.alternativeTiddlers);
		var uri = "/bags/" + space + "_public/tiddlers";
		$.ajax({url: uri, dataType: "text",
			success: function(txt) {
				var tiddlers = txt.split("\n");
				var suggestions = [];
				for(var i = 0; i < tiddlers.length; i++) {
					var thisTitle = tiddlers[i];
					if(errorhandler.areSimilar(title, thisTitle)) {
						suggestions.push(thisTitle);
					}
				}
				$(container).empty();
				if(suggestions.length > 0) {
					$("<h2 />").text(errorhandler.locale.tiddlerSuggestionsHeader).appendTo(container);
					var list = $("<ol />").appendTo(container)[0];
					for(var i = 0; i < suggestions.length; i++) {
						var suggestion = suggestions[i];
						var item = $("<li />").appendTo(list);
						$("<a />").attr("href", "/" + suggestion).text(suggestion).appendTo(item);
					}
				}
			}
		});
	},
	suggestSpaces: function(container, space) {
		$(container).empty(errorhandler.locale.alternativeSpaces);
		$.ajax({url: "/spaces", dataType: "json",
			success: function(spaces) {
				var suggestions = [];
				for(var i = 0; i < spaces.length; i++) {
					var thisSpace = spaces[i];
					if(errorhandler.areSimilar(thisSpace.name, space)) {
						suggestions.push(thisSpace);
					}
				}
				$(container).empty();
				if(suggestions.length > 0) {
					$("<h2 />").text(errorhandler.locale.spaceSuggestionsHeader).appendTo(container);
					var list = $("<ol />").appendTo(container)[0];
					for(var i = 0; i < suggestions.length; i++) {
						var suggestion = suggestions[i];
						var item = $("<li />").appendTo(list);
						var avatar = suggestion.uri + "bags/" + suggestion.name + "_public/tiddlers/SiteIcon";
						$("<img />").attr("src", avatar).appendTo(item).css({width: 48, height: 48});
						$("<a />").attr("href", suggestion.uri).text(suggestion.name).appendTo(item);
					}
				}
			}
		});
	}
};
//}}}
