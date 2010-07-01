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

// hijack refreshTiddler to add private/public/external class to story tiddlers
var _refreshTiddler = Story.prototype.refreshTiddler;
Story.prototype.refreshTiddler = function(title, template, force, customFields,
		defaultText) { // TODO: move into text viewer hijack below?
	var el = _refreshTiddler.apply(this, arguments);
	var tiddler = store.getTiddler(title);
	if(tiddler) {
		var ns = config.extensions.tiddlyspace;
		var space = ns.determineSpace(tiddler, true);
		var type = space && space.name == ns.currentSpace.name ? space.type : "external";
		$(el).removeClass("private public external").addClass(type);
	}
	return el;
};

// hijack text viewer to add public/private icon
var _view = config.macros.view.views.text;
config.macros.view.views.text = function(value, place, params, wikifier,
		paramString, tiddler) {
	if(params[0] == "title") {
		var ns = config.extensions.tiddlyspace;
		var space = ns.determineSpace(tiddler, true);
		var type = space && space.name == ns.currentSpace.name ? space.type : "external";
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
