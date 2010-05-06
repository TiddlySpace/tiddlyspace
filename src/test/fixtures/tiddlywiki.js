config = {
	shadowTiddlers: {
		ToolbarCommands: "|~ViewToolbar|closeTiddler closeOthers +editTiddler" +
			" > fields syncing permalink references jump|\n" +
			"|~EditToolbar|+saveTiddler -cancelTiddler deleteTiddler|"
	},
	extensions: {}
};

Array.prototype.contains = function(item)
{
	return this.indexOf(item) != -1;
};
