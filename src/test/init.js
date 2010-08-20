(function() {

var tiddlyspace = config.extensions.tiddlyspace;
var macro = config.macros.TiddlySpaceInit;

var data = {};
var stash = {};

module("init", {
	setup: function() {
		stash.firstRun = macro.firstRun;
		macro.firstRun = function() {
			data.firstRun = true;
			stash.firstRun.apply(this, arguments);
		};

		stash.update = macro.update;
		macro.update = function() {
			data.update = true;
			stash.update.apply(this, arguments);
		};

		stash.createAvatar = macro.createAvatar;
		macro.createAvatar = function() {
			data.avatar = true;
		};

		stash.RandomColorPalette = config.macros.RandomColorPalette;
		config.macros.RandomColorPalette = {
			generatePalette: function() {
				data.palette = true;
			}
		}
	},
	teardown: function() {
		macro.firstRun = stash.firstRun;
		macro.update = stash.update;
		macro.createAvatar = stash.createAvatar;
		config.macros.RandomColorPalette = stash.RandomColorPalette;

		$.each(data, function(key, value) {
			delete data[key];
		});
		$.each(stash, function(key, value) {
			delete stash[key];
		});
	}
});

test("firstRun", function() {
	strictEqual(data.firstRun, undefined);
	strictEqual(data.update, undefined);
	strictEqual(data.palette, undefined);
	strictEqual(data.avatar, undefined);

	macro.handler(null, "TiddlySpaceInit", null, null, null, null);

	strictEqual(data.firstRun, true);
	strictEqual(data.update, undefined);
	strictEqual(data.palette, true);
	strictEqual(data.avatar, true);
	var flagTiddler = store.getTiddler("fooSetupFlag");
	strictEqual(flagTiddler.fields.tiddlyspaceinit_version, "0.2");
});

test("update from v0.1", function() {
	var tid = new Tiddler("fooSetupFlag");
	tid.fields = {
		tiddlyspaceinit_version: "0.1"
	};
	store.saveTiddler(tid);

	strictEqual(data.firstRun, undefined);
	strictEqual(data.update, undefined);
	strictEqual(data.palette, undefined);
	strictEqual(data.avatar, undefined);

	macro.handler(null, "TiddlySpaceInit", null, null, null, null);

	strictEqual(data.firstRun, undefined);
	strictEqual(data.update, true);
	strictEqual(data.palette, undefined);
	strictEqual(data.avatar, true);
	var flagTiddler = store.getTiddler("fooSetupFlag");
	strictEqual(flagTiddler.fields.tiddlyspaceinit_version, "0.2");
});

test("update from v0.2", function() {
	var tid = new Tiddler("fooSetupFlag");
	tid.fields = {
		tiddlyspaceinit_version: "0.2"
	};
	store.saveTiddler(tid);

	strictEqual(data.firstRun, undefined);
	strictEqual(data.update, undefined);
	strictEqual(data.palette, undefined);
	strictEqual(data.avatar, undefined);

	macro.handler(null, "TiddlySpaceInit", null, null, null, null);

	strictEqual(data.firstRun, undefined);
	strictEqual(data.update, undefined);
	strictEqual(data.palette, undefined);
	strictEqual(data.avatar, undefined);
});

})();
