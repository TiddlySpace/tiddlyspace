/***
!StyleSheet
.private {
	background-color: #FF00FF;
}

.public {
	background-color: #00FFFF;
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
		var type = container ? container.split("_")[1] : null;
		if(type) { // TODO: explicitly check for private/public!?
			$(el).addClass(type);
		}
	}
};

config.shadowTiddlers.StyleSheetTiddlySpace = store.getTiddlerText(tiddler.title + "##StyleSheet");
store.addNotification("StyleSheetTiddlySpace", refreshStyles);

})(jQuery);
//}}}
