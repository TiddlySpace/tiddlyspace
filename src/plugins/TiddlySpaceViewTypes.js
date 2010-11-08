/***
|''Name''|TiddlySpaceViewTypes|
|''Version''|0.5.0|
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

var tweb = config.extensions.tiddlyweb;
var tiddlyspace = config.extensions.tiddlyspace;
config.macros.view.replyLink = {
	locale: {
		label: "Reply to this tiddler"
	}
};

config.macros.view.views.replyLink = function(value, place, params, wikifier,
		paramString, tiddler) {
	var space;
	if(tiddler) {
		var bag = tiddler.fields["server.bag"];
		space = tiddlyspace.resolveSpaceName(bag);
	}
	var container = $('<span class="replyLink" />').appendTo(place)[0];
	tweb.getUserInfo(function(user) {
		if(!user.anon) {
			if(space && user.name != space &&
					user.name != tiddlyspace.currentSpace.name) {
				createSpaceLink(container, user.name, value,
					config.macros.view.replyLink.locale.label);
			}
		}
	});
};

})(jQuery);
//}}}
