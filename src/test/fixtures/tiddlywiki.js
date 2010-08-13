(function() {

var NOP = function() {};

config = {
	shadowTiddlers: {
		ToolbarCommands: "|~ViewToolbar|closeTiddler closeOthers +editTiddler" +
			" > fields syncing permalink references jump|\n" +
			"|~EditToolbar|+saveTiddler -cancelTiddler deleteTiddler|"
	},
	extensions: {},
	macros: {
		search: {}
	}
};

TiddlyWiki = NOP;
store = NOP;
store.getTiddler = function() { return {}; };
store.addNotification = NOP;

refreshStyles = NOP;

Array.prototype.contains = function(item)
{
	return this.indexOf(item) != -1;
};

})();
