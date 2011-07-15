/***
|''Name''|TiddlySpaceToolbar|
|''Description''|augments tiddler toolbar commands with SVG icons|
|''Author''|Osmosoft|
|''Version''|0.6.6|
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
In readonly mode a tiddler called {{{<command>ReadOnly.svg}}} will be used if it exists.
!TODO
* rename (IconToolbarPlugin?)
* support more than one more popup menu in the toolbar.
!Code
***/
//{{{
(function($) {

if(!config.macros.image) {
	throw "Missing dependency: ImageMacroPlugin";
}

var macro = config.macros.toolbar;

macro.icons = {
	cloneTiddler: "editTiddler"
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
	var parsedParams = paramString.parseParams("name")[0];
	if(parsedParams.icons && parsedParams.icons == "yes") {
		this.augmentCommandButtons(place);
	}
	if(parsedParams.more && parsedParams.more == "popup") {
		// note we must override the onclick event like in createTiddlyButton
		// otherwise the click event is the popup AND the slider
		$(".moreCommand", place).each(function(i, el) {
			el.onclick = macro.onClickMorePopUp;
		});
		// buttons that are after a less command should not be in more menu.
		$(".lessCommand ~ .button", place).appendTo(place);
		$(".lessCommand", place).remove();
	}
	return status;
};

macro.refresh = function(place, params) {
	var args = $(place).empty().data("args");
	this.handler.apply(this, args);
};

var imageMacro = config.macros.image;
macro.augmentCommandButtons = function(toolbar) {
	$(".button", toolbar).each(function(i, el) {
		var cmd = $(el).attr("commandname");
		cmd = cmd ? cmd : "moreCommand"; // XXX: special-casing of moreCommand due to ticket #1234
		var icon = store.tiddlerExists(cmd) ? cmd : macro.icons[cmd];
		var text = $(el).text();
		if(readOnly) {
			var readOnlyAlternative = "%0ReadOnly".format([icon]);
			if(store.tiddlerExists(readOnlyAlternative)) {
				icon = readOnlyAlternative;
			}
		}
		if(store.tiddlerExists(icon)) {
			$(el).css({display: "inline-block"}).empty();
			imageMacro.renderImage(el, icon, { alt: text });
		}
	});
};

// provide onClickMore to provide extra commands in a popup
macro.onClickMorePopUp = function(ev) {
	ev = ev || window.event;
	var sibling = this.nextSibling;
	if(sibling) {
		var commands = sibling.childNodes;
		var popup = Popup.create(this);
		$(popup).addClass("taggedTiddlerList");
		for(var i = 0; i < commands.length; i++) {
			var li = createTiddlyElement(popup, "li", null);
			var oldCommand = commands[i];
			var command = oldCommand.cloneNode(true);
			command.onclick = oldCommand.onclick;
			li.appendChild(command);
		}
		Popup.show();
	}
	ev.cancelBubble = true;
	if(ev.stopPropagation) {
		ev.stopPropagation();
	}
	return false;
};

})(jQuery);
//}}}
