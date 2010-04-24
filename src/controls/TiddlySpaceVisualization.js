/***
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

var determineSpace = function(container_name) { // TODO: should be globally available
	var container = container_name.split("_"); // XXX: brittle (space name must not contain underscores)
	if(container.length == 1) {
		return false;
	} else {
		return {
			name: container[0],
			type: container[1]
		};
	}
};

// determine current space -- TODO: should be cached globally!?
var workspace = config.defaultCustomFields["server.workspace"];
var container = workspace ? workspace.split("/")[1] : null;
var current_space = container ? determineSpace(container): null;

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
			var space = determineSpace(container);
			var type = space && space.name == current_space.name ? space.type : "external";
			$(el).addClass(type);
		}
	}
};

config.shadowTiddlers.StyleSheetTiddlySpace = store.getTiddlerText(tiddler.title + "##StyleSheet");
store.addNotification("StyleSheetTiddlySpace", refreshStyles);

})(jQuery);
//}}}
