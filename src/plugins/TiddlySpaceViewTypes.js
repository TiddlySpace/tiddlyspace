/***
|''Name''|TiddlySpaceViewTypes|
|''Version''|0.5.4|
|''Status''|@@beta@@|
|''Description''|Provides TiddlySpace specific view types|
|''Author''|Jon Robson|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/raw/master/src/plugins/TiddlySpaceViewTypes.js|
|''Requires''|TiddlySpaceConfig TiddlySpaceTiddlerIconsPlugin|
!Usage
Provides replyLink, spaceLink and SiteIcon view types.
!!SiteIcon view parameters
* labelPrefix / labelSuffix : prefix or suffix the label with additional text. eg. labelPrefix:'modified by '
* spaceLink: if set to "yes" will make any avatars link to the corresponding space. {{{<<originMacro spaceLink:yes>>}}}

!Code
***/
//{{{
(function($) {

var tiddlyspace = config.extensions.tiddlyspace;
var originMacro = config.macros.tiddlerOrigin;

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
		title = tiddler[valueField] ? tiddler[valueField] : tiddler.fields[valueField];
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

config.macros.view.views.spaceLink = function(value, place, params, wikifier,
		paramString, tiddler) {
		var spaceName = tiddlyspace.resolveSpaceName(value);
		var isBag = params[0] == "server.bag" && value === spaceName ? true : false;
		var args = paramString.parseParams("anon")[0];
		var titleField = args.anon[2];
		var labelField = args.labelField ? args.labelField[0] : false;
		var label;
		if(labelField) {
			label = tiddler[labelField] ? tiddler[labelField] : tiddler.fields[labelField];
		} else {
			label = args.label ? args.label[0] : false;
		}
		var title = tiddler[titleField] ? tiddler[titleField] : tiddler.fields[titleField];

		var link = createSpaceLink(place, spaceName, title, label, isBag);
		if(args.external && args.external[0] == "no") {
			$(link).click(function(ev) {
				var el = $(ev.target);
				var title = el.attr("tiddler");
				var bag = el.attr("bag");
				var space = el.attr("tiddlyspace");
				bag = space ? space + "_public" : bag;
				if(title && bag) {
					ev.preventDefault();
					tiddlyspace.displayServerTiddler(el[0], title,
						"bags/" + bag);
				}
				return false;
			});
		}
};

config.macros.view.views.SiteIcon = function(value, place, params, wikifier,
		paramString, tiddler) {
	var options = originMacro.getOptions(paramString);
	if(!tiddler || value == "None") { // some core tiddlers lack modifier
		value = false;
	}
	var field = params[0];
	if(field == "server.bag") {
		options.notSpace = !originMacro._isSpace(value);
	}
	tiddlyspace.renderAvatar(place, value, options);
};

})(jQuery);
//}}}
