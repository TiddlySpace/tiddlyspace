(function() {

var tiddlyspace = config.extensions.tiddlyspace;
var macro = config.macros.TiddlySpaceInit;

var log = {};
var stash = {};

var _reset = function(obj) {
	var keys = [];
	$.each(log, function(key, value) {
		keys.push(key);
	});
	$.each(keys, function(i, key) {
		delete log[key];
	});
};

module("init", {
	setup: function() {
		stash.firstRun = macro.firstRun;
		macro.firstRun = function() {
			log.firstRun = true;
			stash.firstRun.apply(this, arguments);
		};

		stash.update = macro.update;
		macro.update = function() {
			log.update = true;
			stash.update.apply(this, arguments);
		};

		stash.createAvatar = macro.createAvatar;
		macro.createAvatar = function() {
			log.avatar = true;
		};

		stash.RandomColorPalette = config.macros.RandomColorPalette;
		config.macros.RandomColorPalette = {
			generatePalette: function() {
				log.palette = true;
			}
		};

		stash.autoSaveChanges = window.autoSaveChanges;
		window.autoSaveChanges = function(onlyIfDirty, tiddlers) {
			log.autoSave = tiddlers;
		};
	},
	teardown: function() {
		macro.firstRun = stash.firstRun;
		macro.update = stash.update;
		macro.createAvatar = stash.createAvatar;
		config.macros.RandomColorPalette = stash.RandomColorPalette;
		window.autoSaveChanges = stash.autoSaveChanges;

		_reset(stash);
		_reset(log);
	}
});

test("firstRun", function() {
	strictEqual(log.firstRun, undefined);
	strictEqual(log.update, undefined);
	strictEqual(log.palette, undefined);
	strictEqual(log.avatar, undefined);

	macro.handler(null, "TiddlySpaceInit", null, null, null, null);

	strictEqual(log.firstRun, true);
	strictEqual(log.update, undefined);
	strictEqual(log.palette, true);
	strictEqual(log.avatar, true);
	strictEqual(log.autoSave.length, 2); // ColorPalette and SiteIcon handled separately
	var flagTiddler = store.getTiddler("fooSetupFlag");
	strictEqual(flagTiddler.fields.tiddlyspaceinit_version, "0.2");
});

test("update from v0.1", function() {
	var tid = new Tiddler("fooSetupFlag");
	tid.fields = {
		tiddlyspaceinit_version: "0.1"
	};
	store.saveTiddler(tid);

	strictEqual(log.firstRun, undefined);
	strictEqual(log.update, undefined);
	strictEqual(log.palette, undefined);
	strictEqual(log.avatar, undefined);

	macro.handler(null, "TiddlySpaceInit", null, null, null, null);

	strictEqual(log.firstRun, undefined);
	strictEqual(log.update, true);
	strictEqual(log.palette, undefined);
	strictEqual(log.avatar, true);
	var flagTiddler = store.getTiddler("fooSetupFlag");
	strictEqual(flagTiddler.fields.tiddlyspaceinit_version, "0.2");
});

test("update from v0.2", function() {
	var tid = new Tiddler("fooSetupFlag");
	tid.fields = {
		tiddlyspaceinit_version: "0.2"
	};
	store.saveTiddler(tid);

	strictEqual(log.firstRun, undefined);
	strictEqual(log.update, undefined);
	strictEqual(log.palette, undefined);
	strictEqual(log.avatar, undefined);

	macro.handler(null, "TiddlySpaceInit", null, null, null, null);

	strictEqual(log.firstRun, undefined);
	strictEqual(log.update, undefined);
	strictEqual(log.palette, undefined);
	strictEqual(log.avatar, undefined);
});

})();
