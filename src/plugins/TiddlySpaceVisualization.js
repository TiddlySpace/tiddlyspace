/***
|''Requires''|TiddlySpaceConfig ImageMacroPlugin|
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
		}
		else {
			var tiddlyweb = config.extensions.tiddlyweb;
			tiddlyweb.getStatus(function(status) {
				var server_host = status.server_host;
				var tsHost = server_host.scheme +"://" + server_host.host;
				if(server_host.port && server_host.port != '80' &&
					server_host.port != '443') {
					tsHost += ":" + server_host.port;
				}
				var spaceName = "tiddlyspace";
				if(space.name) {
					spaceName = "%0_public".format([space.name]);
				}
				var imageSrc = "%0/bags/%1/tiddlers/SiteIcon".format([tsHost,spaceName]);
				$("<img/>").attr("src",imageSrc).attr("alt",spaceName).
				prependTo(place);
			});
		}
		$(place).attr("title", "private");
	}
	_view.apply(this, arguments);
};

})(jQuery);
//}}}
