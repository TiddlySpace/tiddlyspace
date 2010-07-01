/***
|''Requires''|TiddlySpaceConfig ImageMacroPlugin|
!StyleSheet
.public,
.private,
.external {
	border-left: 5px solid #A2F7A2;
}

.public {
	border-color: #C7EAFF;
}

.private {
	border-color: #FFCAE9;
}
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
		$(place).attr("title", "private");
	}
	_view.apply(this, arguments);
};

var name = "StyleSheetTiddlySpace";
config.shadowTiddlers[name] = store.getTiddlerText(tiddler.title + "##StyleSheet");
store.addNotification(name, refreshStyles);

})(jQuery);
//}}}
