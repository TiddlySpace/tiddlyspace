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

// hijack view handler to add private/public class to story tiddlers
var _handler = config.macros.view.handler;
config.macros.view.handler = function(place, macroName, params, wikifier, paramString, tiddler) {
	_handler.apply(this, arguments);
	if(params[0] == "title") {
		var bag = tiddler.fields["server.bag"];
		if(!bag) { // new tiddler
			var workspace = tiddler.fields["server.workspace"];
			bag = workspace ? workspace.split("/")[1] : null;
		}
		var type = bag ? bag.split("_")[1] : null;
		if(type) { // TODO: explicitly check for private/public!?
			var el = story.findContainingTiddler(place);
			$(el).addClass(type);
		}
	}
};

config.shadowTiddlers.StyleSheetTiddlySpace = store.getTiddlerText(tiddler.title + "##StyleSheet");
store.addNotification("StyleSheetTiddlySpace", refreshStyles);

})(jQuery);
//}}}
