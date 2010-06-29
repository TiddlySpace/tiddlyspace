/***
|''Name''|TiddlySpaceToolbar|
|''Description''|augments tiddler toolbar commands with SVG icons|
***/
//{{{
(function($){

var _handler = config.macros.toolbar.handler;
config.macros.toolbar.handler = function(place, macroName, params, wikifier,
		paramString, tiddler) {
	var toolbar = $(place);
	toolbar.attr({
		refresh: "macro",
		macroName: macroName
	}).data("args", arguments);
	var status = _handler.apply(this, arguments);
	if(tiddler.isReadOnly()) {
		toolbar.addClass("toolbarReadOnly");
	} else {
		toolbar.removeClass("toolbarReadOnly");
	}
	if(config.macros.image && config.macros.image.svgAvailable){
		augmentToolbar(place);
	}
	return status;
};

config.macros.toolbar.refresh = function(place, params) {
	var args = $(place).empty().data("args");
	this.handler.apply(this, args);
};

var augmentToolbar = function(toolbar) { // XXX: should not be private!?
	$(toolbar).children(".button").each(function(i, el) {
		var cmd = el.className.match(/\bcommand_([^ ]+?)\b/); // XXX: gratuitous RegEx?
		cmd = cmd ? cmd[1] : "moreCommand"; // XXX: special-casing of moreCommand due to ticket #1234
		var title = "%0.svg".format([cmd]);
		if(store.tiddlerExists(title)) { // XXX: does not support shadow tiddler
			$(el).empty();
			wikify("<<image %0>>".format([title]), el); // XXX: use function call instead of wikification
		}
	});
};

// override onClickMore to provide extra commands in a popup
config.macros.toolbar.onClickMore = function(ev) {
	var sibling = this.nextSibling;
	var commands = sibling.childNodes;
	var popup = Popup.create(this);
	addClass(popup ,"taggedTiddlerList");
	for(var i = 0; i < commands.length; i++){
		var li = createTiddlyElement(popup, "li", null);
		var oldCommand = commands[i];
		var command = oldCommand.cloneNode(true);
		command.onclick = oldCommand.onclick;
		li.appendChild(command);
	}
	Popup.show();
	ev.stopPropagation();
};

})(jQuery);
//}}}
