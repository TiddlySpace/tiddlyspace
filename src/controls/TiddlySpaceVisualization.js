/***
|''Requires''|TiddlySpaceConfig|
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

// hijack displayTiddler to add private/public class to story tiddlers
var _displayTiddler = Story.prototype.displayTiddler;
Story.prototype.displayTiddler = function(srcElement, tiddler, template,
	animate, unused, customFields, toggle, animationSrc) {
	var el = _displayTiddler.apply(this, arguments);
	if(!(tiddler instanceof Tiddler)) {
		tiddler = store.getTiddler(tiddler);
	}
	if(tiddler) {
		var container = tiddler.fields["server.bag"];
		if(!container) { // new tiddler
			var workspace = tiddler.fields["server.workspace"];
			container = workspace ? workspace.split("/")[1] : null;
		}
		if(container) {
			var cfg = config.extensions.tiddlyspace;
			var space = cfg.determineSpace(container);
			var type = space && space.name == cfg.currentSpace ? space.type : "external";
			$(el).addClass(type);
		}
	}
};

config.shadowTiddlers.StyleSheetTiddlySpace = store.getTiddlerText(tiddler.title + "##StyleSheet");
store.addNotification("StyleSheetTiddlySpace", refreshStyles);

})(jQuery);
//}}}
