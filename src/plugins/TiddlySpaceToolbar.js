/***
|''Name''|TiddlySpaceToolbar|
|''Description''|Updates the toolbar macro to use svg buttons and a popup for the more menu|
***/
//{{{
(function($){
	config.macros.toolbar._TSoldHandler = config.macros.toolbar.handler;
	config.macros.toolbar.handler = function(place,macroName,params,wikifier,paramString,tiddler)
	{
		
		this._TSoldHandler(place,macroName,params,wikifier,paramString,tiddler);
		if(tiddler.isReadOnly()){
			$(place).addClass("toolbarReadOnly");
		}
		if(config.macros.image && config.macros.image.svgAvailable){ //only do this for people who have this macro available!
			var cancelTiddlerButton =$(".command_cancelTiddler",place);
			cancelTiddlerButton.empty();
			wikify("<<image cancelTiddler.svg>>",cancelTiddlerButton[0]);

			var closeTiddlerButton =$(".command_closeTiddler",place);
			closeTiddlerButton.empty();
			wikify("<<image closeTiddler.svg>>",closeTiddlerButton[0]);

			var editTiddlerButton = $(".command_editTiddler",place);
			editTiddlerButton.empty();
			wikify("<<image editTiddler.svg>>",editTiddlerButton[0]);

			var deleteTiddlerButton =$(".command_deleteTiddler",place);
			deleteTiddlerButton.empty();
			wikify("<<image deleteTiddler.svg>>",deleteTiddlerButton[0]);

			var saveTiddlerButton =$(".command_saveTiddler",place);
			saveTiddlerButton.empty();
			wikify("<<image saveTiddler.svg>>",saveTiddlerButton[0]);

			var moreTiddlerButton = $("a.moreCommand",place);
			moreTiddlerButton.empty();
			wikify("<<image moreCommand.svg>>",moreTiddlerButton[0]);
		}
	}

	config.macros.toolbar.onClickMore = function(ev)
	{
		var sibling = this.nextSibling;
		var commands = sibling.childNodes;
		var popup = Popup.create(this);
		addClass(popup,"taggedTiddlerList");

		for(var i=0; i < commands.length; i++){
			var li =createTiddlyElement(popup,"li",null);
			var oldCommand =commands[i];
			var command = oldCommand.cloneNode(true);
			command.onclick = oldCommand.onclick;
			li.appendChild(command);
		}
		Popup.show();

		var e = ev || window.event;
		e.cancelBubble = true;
		if(e.stopPropagation) e.stopPropagation();
	}
	
	var shadows = config.shadowTiddlers;
	shadows.ToolbarCommands = "|~ViewToolbar|+editTiddler closeTiddler > cloneTiddler pubRev closeOthers fields publishTiddlerRevision revisions syncing permalink references jump|"+
	"\n|~EditToolbar|+saveTiddler -cancelTiddler deleteTiddler|";
	
})(jQuery);
//}}}
