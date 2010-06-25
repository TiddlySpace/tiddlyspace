/***
|''Name''|TiddlySpaceToolbar|
|''Description''|augments tiddler toolbar commands with SVG icons|
***/
//{{{
(function($){

var _handler = config.macros.toolbar.handler;
config.macros.toolbar.handler = function(place, macroName, params, wikifier,
		paramString, tiddler) {
	var status = _handler.apply(this, arguments);
	if(tiddler.isReadOnly()){
		$(place).addClass("toolbarReadOnly");
	}
	if(config.macros.image && config.macros.image.svgAvailable){
		var commands = ["closeTiddler", "editTiddler", "moreCommand",
			"saveTiddler", "cancelTiddler", "deleteTiddler"]; // TODO: should automatically try to find icon for each command button
		$.each(commands, function(i, cmd) {
			var selector = ".command_%0".format([cmd]);
			var btn = $(selector, place).empty();
			wikify("<<image %0.svg>>".format([cmd]), btn[0]); // XXX: use function call instead of wikification
		});
		// XXX: duplication due to special handling; cf. ticket #1234
		var btn = $("a.moreCommand", place).empty();
		wikify("<<image moreCommand.svg>>", btn[0]);
	}
	return status
}

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

// XXX: does not belong here; TiddlySpaceConfig!? -- XXX: overriding is bad (cf. TiddlyWebConfig)
config.shadowTiddlers.ToolbarCommands = "|~ViewToolbar|+editTiddler closeTiddler > cloneTiddler pubRev closeOthers fields publishTiddlerRevision revisions syncing permalink references jump|"+
"\n|~EditToolbar|+saveTiddler -cancelTiddler deleteTiddler|";

})(jQuery);
//}}}
