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

// hijack refreshTiddler to add private/public/external class to story tiddlers
var _refreshTiddler = Story.prototype.refreshTiddler;
Story.prototype.refreshTiddler = function(title, template, force, customFields,
	defaultText) {
	var el = _refreshTiddler.apply(this, arguments);
	var tiddler = store.getTiddler(title);
	if(tiddler) {
		var container = tiddler.fields["server.bag"];
		if(!container) { // new tiddler
			var workspace = tiddler.fields["server.workspace"];
			container = workspace ? workspace.split("/")[1] : null; // XXX: brittle
		}
		if(container) {
			var cfg = config.extensions.tiddlyspace;
			var space = cfg.determineSpace(container);
			var type = space && space.name == cfg.currentSpace ? space.type : "external";
			$(el).removeClass("private public external").addClass(type);
		}
	}
	return el;
};

config.shadowTiddlers.StyleSheetTiddlySpace = store.getTiddlerText(tiddler.title + "##StyleSheet");
store.addNotification("StyleSheetTiddlySpace", refreshStyles);

})(jQuery);
//}}}
