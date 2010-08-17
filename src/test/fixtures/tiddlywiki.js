(function() {

var NOP = function() {};

config = {
	annotations: {},
	extensions: {},
	macros: {
		search: {}
	},
	shadowTiddlers: {
		ToolbarCommands: "|~ViewToolbar|closeTiddler closeOthers +editTiddler" +
			" > fields syncing permalink references jump|\n" +
			"|~EditToolbar|+saveTiddler -cancelTiddler deleteTiddler|"
	}
};

Tiddler = function(title) {
	this.title = title;
};
Tiddler.prototype.incChangeCount = NOP;

TiddlyWiki = NOP;
store = function() {};
store._tiddlers = {
	"SiteTitle": {}
};
store.getTiddler = function(title) {
	return this._tiddlers[title];
};
store.saveTiddler = function(tiddler) {
	store._tiddlers[tiddler.title] = tiddler;
	return tiddler;
}
store.addNotification = NOP;

autoSaveChanges = NOP;
refreshStyles = NOP;

Array.prototype.contains = function(item)
{
	return this.indexOf(item) != -1;
};

String.prototype.format = function(substrings)
{
	var subRegExp = /(?:%(\d+))/mg;
	var currPos = 0;
	var r = [];
	do {
		var match = subRegExp.exec(this);
		if(match && match[1]) {
			if(match.index > currPos)
				r.push(this.substring(currPos,match.index));
			r.push(substrings[parseInt(match[1])]);
			currPos = subRegExp.lastIndex;
		}
	} while(match);
	if(currPos < this.length)
		r.push(this.substring(currPos,this.length));
	return r.join("");
};

})();
