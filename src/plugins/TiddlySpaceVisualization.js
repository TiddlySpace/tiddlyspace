/***
|''Name''|TiddlySpaceVisualization|
|''Version''||
|''Description''||
|''Requires''|TiddlySpaceConfig ImageMacroPlugin|
|''Source''||
!Code
***/
//{{{
(function($) {

if(!config.macros.image) {
	throw "Missing dependency: ImageMacroPlugin";
}

// hijack text viewer to add public/private icon
var _view = config.macros.view.views.text;
config.macros.view.views.text = function(value, place, params, wikifier,
		paramString, tiddler) {
	if(params[0] == "title") {
		var type = "private";
		if(store.tiddlerExists(tiddler.title) || store.isShadowTiddler(tiddler.title)) {
			var ns = config.extensions.tiddlyspace;
			var space = ns.determineSpace(tiddler, true);
			type = space && space.name == ns.currentSpace.name ? space.type : "external";
		}

		var tidEl = story.findContainingTiddler(place);
		$(tidEl).removeClass("private public external").addClass(type);

		if(type != "external") {
			invokeMacro(place, "image", "%0Icon alt:%0".format([type]), null, tiddler); // XXX: should call macro's function directly
		} else {
			var ns = config.extensions.tiddlyweb;
			ns.getStatus(function(status) {
				var uri = getAvatar(ns.status.server_host.url, space);
				$('<img alt="" />').attr("src", uri).prependTo(place);
			});
		}
		$(place).attr("title", type);
	}
	_view.apply(this, arguments);
};

var getAvatar = function(host, space) {
	var container = {
		type: space ? "recipe" : "bag",
		name: space ? "%0_public".format([space.name]) : "tiddlyspace"
	}
	return "%0/%1s/%2/tiddlers/SiteIcon".format([host, container.type,
		container.name]);
};

})(jQuery);
//}}}
