/***
|''Name''|TiddlySpaceToolbar|
|''Description''|augments tiddler toolbar commands with SVG icons|
|''Author''|Osmosoft|
|''Version''|0.6.0|
|''Status''|@@beta@@|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/raw/master/src/plugins/TiddlySpaceToolbar.js|
|''CodeRepository''|http://github.com/TiddlySpace/tiddlyspace|
|''License''|[[BSD|http://www.opensource.org/licenses/bsd-license.php]]|
|''CoreVersion''|2.5.0|
|''Requires''|ImageMacroPlugin|
|''Keywords''|toolbar icons SVG|
!Description
replaces tiddler toolbar commands with SVG icons if available
!Notes
requires [[ImageMacroPlugin|http://svn.tiddlywiki.org/Trunk/contributors/JonRobson/plugins/ImageMacroPlugin/plugins/ImageMacroPlugin.tid]]

SVG icons are drawn from tiddlers titled {{{<command>.svg}}}
!TODO
* rename (IconToolbarPlugin?)
!Code
***/
//{{{
(function($) {

if(!config.macros.image) {
	throw "Missing dependency: ImageMacroPlugin";
}

var macro = config.macros.toolbar;

macro.icons = {
	cloneTiddler: "editTiddler",
	savePublicTiddler: "saveTiddler"
};

var _handler = macro.handler;
macro.handler = function(place, macroName, params, wikifier,
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
	if(config.macros.image.svgAvailable) {
		this.augmentCommandButtons(place);
	}
	return status;
};

macro.refresh = function(place, params) {
	var args = $(place).empty().data("args");
	this.handler.apply(this, args);
};

macro.augmentCommandButtons = function(toolbar) {
	$(toolbar).children(".button").each(function(i, el) {
		var cmd = el.className.match(/\bcommand_([^ ]+?)\b/); // XXX: gratuitous RegEx?
		cmd = cmd ? cmd[1] : "moreCommand"; // XXX: special-casing of moreCommand due to ticket #1234
		var icon = macro.icons[cmd] || cmd;
		var title = "%0.svg".format([icon]);
		if(store.tiddlerExists(title)) { // XXX: does not support shadow tiddlers
			$(el).empty();
			wikify("<<image %0>>".format([title]), el); // XXX: use function call instead of wikification
		}
	});
};

// override onClickMore to provide extra commands in a popup
macro.onClickMore = function(ev) {
	var sibling = this.nextSibling;
	var commands = sibling.childNodes;
	var popup = Popup.create(this);
	addClass(popup ,"taggedTiddlerList");
	for(var i = 0; i < commands.length; i++) {
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
