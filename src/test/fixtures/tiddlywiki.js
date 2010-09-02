(function() {

var NOP = function() {};

config = {
	annotations: {},
	extensions: {},
	commands: {
		deleteTiddler: {
			
		}
	},
	macros: {
		search: {},
		view: {
			views: {}
		}
	},
	shadowTiddlers: {
		ToolbarCommands: "|~ViewToolbar|closeTiddler closeOthers +editTiddler" +
			" > fields syncing permalink references jump|\n" +
			"|~EditToolbar|+saveTiddler -cancelTiddler deleteTiddler|"
	}
};

Story = function() {};

Story.prototype = {
	refreshTiddler: function() {
		
	}
};
story = new Story();

Tiddler = function(title) {
	this.title = title;
	this.fields = {};
	this.tags = [];
};
Tiddler.prototype.incChangeCount = NOP;

TiddlyWiki = function() {
	this._tiddlers = {};
	var tiddlers = this._tiddlers;
	this.forEachTiddler = function(callback) {
		for(var t in tiddlers) {
			var tiddler = tiddlers[t];
			if(tiddler instanceof Tiddler)
				callback.call(this, t, tiddler);
		}
	};
};
TiddlyWiki.prototype.getTiddler = function(title) {
	return this._tiddlers[title];
};
TiddlyWiki.prototype.getTiddlers = function(field,excludeTag)
{
	var results = [];
	this.forEachTiddler(function(title, tiddler) {
		if(excludeTag == undefined || !tiddler.isTagged(excludeTag))
			results.push(tiddler);
	});
	if(field) {
		results.sort(function(a,b) {return a[field] < b[field] ? -1 : (a[field] == b[field] ? 0 : +1);});
	}
	return results;
};
TiddlyWiki.prototype.getTaggedTiddlers = function(tag, sortField)
{
	return this.reverseLookup("tags", tag, true, sortField);
};
TiddlyWiki.prototype.reverseLookup = function(lookupField, lookupValue, 
	lookupMatch,sortField) {
	var results = [];
	this.forEachTiddler(function(title, tiddler) {
		var f = !lookupMatch;
		for(var lookup = 0; lookup < tiddler[lookupField].length; lookup++) {
			if(tiddler[lookupField][lookup] == lookupValue) {
				f = lookupMatch;
			}
		}
		if(f) {
			results.push(tiddler);
		}
	});
	if(!sortField) {
		sortField = "title";
	}
	results.sort(function(a,b) {return a[sortField] < b[sortField] ? -1 : (a[sortField] == b[sortField] ? 0 : +1);});
	return results;
};
TiddlyWiki.prototype.addTiddler = function(tiddler) {
	this._tiddlers[tiddler.title] = tiddler;
};
TiddlyWiki.prototype.getTiddlerText = function(title) {
	var tiddler = this._tiddlers[title];
	return tiddler ? tiddler.text : null;
};
TiddlyWiki.prototype.saveTiddler = function(title, newTitle, newBody, modifier,
		modified, tags, fields, clearChangeCount, created, creator) {
	var tiddler = new Tiddler(newTitle);
	tiddler.creator = creator;
	tiddler.created = created;
	tiddler.modifier = modifier;
	tiddler.modified = modifier;
	tiddler.tags = tags;
	tiddler.text = newBody;
	tiddler.fields = fields;
	this.addTiddler(tiddler);
	return tiddler;
}
TiddlyWiki.prototype.removeTiddler = function(title) {
	delete this._tiddlers[title];
};
TiddlyWiki.prototype.addNotification = NOP;

store = new TiddlyWiki();

refreshStyles = NOP;
autoSaveChanges = NOP;

TiddlyWiki.prototype.isDirty = function() {
	return this.dirty;
};

TiddlyWiki.prototype.setDirty = function(dirty) {
	this.dirty = dirty ? true : false;
};


TiddlyWiki.prototype.tiddlerExists = function(title) {
	return this._tiddlers[title] ? true : false;
};

TiddlyWiki.prototype.isShadowTiddler = function(title) {
	return config.shadowTiddlers[title] === undefined ? false : true;
};

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
