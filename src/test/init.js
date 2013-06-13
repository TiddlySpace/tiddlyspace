(function(module, $) {

var tiddlyspace = config.extensions.tiddlyspace;
var plugin = config.extensions.TiddlySpaceInit;

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
		stash.firstRun = plugin.firstRun;
		plugin.firstRun = function() {
			log.firstRun = true;
			stash.firstRun.apply(this, arguments);
		};

		stash.update = plugin.update;
		plugin.update = function() {
			log.update = true;
			stash.update.apply(this, arguments);
		};

		stash.createAvatar = plugin.createAvatar;
		plugin.createAvatar = function() {
			log.avatar = true;
		};

		stash.RandomColorPalette = config.macros.RandomColorPalette;
		config.macros.RandomColorPalette = {
			generatePalette: function() {
				log.palette = true;
			}
		};

		stash.autoSaveChanges = autoSaveChanges;
		autoSaveChanges = function(onlyIfDirty, tiddlers) {
			log.autoSave = tiddlers;
		};
	},
	teardown: function() {
		plugin.firstRun = stash.firstRun;
		plugin.update = stash.update;
		plugin.createAvatar = stash.createAvatar;
		config.macros.RandomColorPalette = stash.RandomColorPalette;
		window.autoSaveChanges = stash.autoSaveChanges;

		_reset(stash);
		_reset(log);
		store = new TiddlyWiki();
	}
});

test("activation", function() { // NB: assertions should be identical to firstRun test's
	strictEqual(log.firstRun, undefined);
	strictEqual(log.update, undefined);
	strictEqual(log.palette, undefined);
	strictEqual(log.avatar, undefined);
	var flagTiddler = store.getTiddler("fooSetupFlag");
	strictEqual(flagTiddler, undefined);

	jQuery(document).trigger("startup");

	strictEqual(log.firstRun, true);
	strictEqual(log.update, undefined);
	strictEqual(log.palette, true);
	strictEqual(log.avatar, true);
	strictEqual(log.autoSave.length, 2); // ColorPalette and SiteIcon handled separately
	flagTiddler = store.getTiddler("fooSetupFlag");
	strictEqual(flagTiddler.fields.tiddlyspaceinit_version, "0.6");
});

test("firstRun", function() { // NB: assertions should be identical to activation test's
	strictEqual(log.firstRun, undefined);
	strictEqual(log.update, undefined);
	strictEqual(log.palette, undefined);
	strictEqual(log.avatar, undefined);
	var flagTiddler = store.getTiddler("fooSetupFlag");
	strictEqual(flagTiddler, undefined);

	plugin.dispatch();

	strictEqual(log.firstRun, true);
	strictEqual(log.update, undefined);
	strictEqual(log.palette, true);
	strictEqual(log.avatar, true);
	strictEqual(log.autoSave.length, 2); // ColorPalette and SiteIcon handled separately
	flagTiddler = store.getTiddler("fooSetupFlag");
	strictEqual(flagTiddler.fields.tiddlyspaceinit_version, "0.6");
	strictEqual($.inArray("excludePublisher", flagTiddler.tags) > -1, true);
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

	plugin.dispatch();

	strictEqual(log.firstRun, undefined);
	strictEqual(log.update, true);
	strictEqual(log.palette, undefined);
	strictEqual(log.avatar, true);
	var flagTiddler = store.getTiddler("fooSetupFlag");
	strictEqual(flagTiddler.fields.tiddlyspaceinit_version, "0.6");
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

	plugin.dispatch();

	strictEqual(log.firstRun, undefined);
	strictEqual(log.update, true);
	strictEqual(log.palette, undefined);
	strictEqual(log.avatar, undefined);
});

test("update from v0.2", function() {
	var tid = new Tiddler("fooSetupFlag");
	tid.fields = {
		tiddlyspaceinit_version: "0.2"
	};
	store.saveTiddler(tid);

	plugin.dispatch();
	var flagTiddler = store.getTiddler("fooSetupFlag");

	strictEqual(flagTiddler.tags.contains("excludePublisher"), true);
	strictEqual(flagTiddler.fields.tiddlyspaceinit_version, "0.6");
});

test("setupMarkupPreHead", function() {
	plugin.setupMarkupPreHead();
	var prehead = store.getTiddler("MarkupPreHead");
	strictEqual(prehead.fields["server.workspace"], "bags/foo_public");
});

})(QUnit.module, jQuery);
