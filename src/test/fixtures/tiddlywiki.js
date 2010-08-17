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
store = function() {};
store._tiddlers = {
	"SiteTitle": {}
};
store.getTiddler = function(title) {
	console.log("gT", title, this._tiddlers[title], store._tiddlers[title]);
	return this._tiddlers[title];
};
store.addNotification = NOP;

refreshStyles = NOP;

Array.prototype.contains = function(item)
{
	return this.indexOf(item) != -1;
};

})();
