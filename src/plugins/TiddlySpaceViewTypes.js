/***
|''Name''|TiddlySpaceViewTypes|
|''Version''|0.5.2|
|''Status''|@@beta@@|
|''Description''|Provides TiddlySpace specific view types|
|''Author''|Jon Robson|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/raw/master/src/plugins/TiddlySpaceViewTypes.js|
|''Requires''|TiddlySpaceConfig|
!Usage
Provides replyLink view type.

!Code
***/
//{{{
(function($) {

var tiddlyspace = config.extensions.tiddlyspace;

config.macros.view.replyLink = {
	locale: {
		label: "Reply to this tiddler"
	}
};

config.macros.view.views.replyLink = function(value, place, params, wikifier,
		paramString, tiddler) {
	var valueField = params[0];
	var imported;
	if(valueField == "title") { // special casing for imported tiddlers
		var localTitle = tiddler.title;
		var serverTitle = tiddler.fields["server.title"];
		if(serverTitle && localTitle != serverTitle) {
			value = serverTitle ? serverTitle : localTitle;
			imported = true;
		}
	} else {
		title = tiddler[titleField] ? tiddler[titleField] : tiddler.fields[titleField];
	}
	var args = paramString.parseParams("anon")[0];
	var label = (args.label) ? args.label : config.macros.view.replyLink.locale.label;
	var space;
	if(tiddler) {
		var bag = tiddler.fields["server.bag"];
		space = tiddlyspace.resolveSpaceName(bag);
	}
	var container = $('<span class="replyLink" />').appendTo(place)[0];
	config.extensions.tiddlyweb.getUserInfo(function(user) {
		if(!user.anon) {
			if((space && user.name != space &&
					user.name != tiddlyspace.currentSpace.name) || imported) {
				createSpaceLink(container, user.name, value, label);
			}
		}
	});
};

})(jQuery);
//}}}
