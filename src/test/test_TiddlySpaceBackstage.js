(function(module, $) {

var _image, _avatar, _filterTiddlers, _refreshAllTiddlers, refreshed, _unplugged;

module("TiddlySpaceBackstage plugin", {
	setup: function() {
		_unplugged = config.unplugged;
		config.unplugged =  false;
		$('<div id="backstagePanel"><div class="tiddlyspaceMenu"><div class="unsyncedList"></div></div></div>').
			appendTo(document.body);
		$('<div task="tiddlyspace"><div class="iconContainer"></div></div>').appendTo(document.body);
		_image = config.macros.image;
		_avatar = config.extensions.tiddlyspace.renderAvatar;
		config.macros.image.renderImage = function(el, src) {
			$(el).attr("image", src);
		};
		_filterTiddlers = store.filterTiddlers;
		store.filterTiddlers = function() {
			return [];
		};
		config.extensions.tiddlyspace.renderAvatar = function(el, name){
			$(el).attr("site-icon", name);
		};
		_refreshAllTiddlers = story.refreshAllTiddlers;
		refreshed = false;
		story.refreshAllTiddlers = function() {
			refreshed = true;
		};
	},
	teardown: function() {
		config.macros.image = _image;
		config.extensions.tiddlyspace.renderAvatar = _avatar;
		$("[task=tiddlyspace]").remove();
		store.filterTiddlers = _filterTiddlers;
		story.refreshAllTiddlers = _refreshAllTiddlers;
		$("#backstagePanel").remove();
		config.unplugged = _unplugged;
	}
});

test("addClasses", function() {
	// setup
	var el = $("<div />")[0];
	var task = $("<div />").addClass("backstageTask");
	task.clone().attr("task", "foo").appendTo(el);
	backstage.tiddlyspace.addClasses(el);
	strictEqual($(".task_foo", el).length, 1);
});

test("loginButton (logged in)", function() {
	var el = $("<div />")[0];
	var task = $("<div />").attr("task", "login").text("foo").appendTo(el);
	backstage.tiddlyspace.loginButton(el, { name: "jon" });
	strictEqual($("[task=login]", el).length, 0);
});

test("loginButton (not logged in)", function() {
	var el = $("<div />")[0];
	var task = $("<div />").attr("task", "login").text("foo").appendTo(el);
	backstage.tiddlyspace.loginButton(el, { anon: true });
	var login = $("[task=login]", el);
	strictEqual(login.length, 1);
	strictEqual(login.text(), "login");
	strictEqual($("[image=/bags/common/tiddlers/defaultUserIcon]", el).length, 1);
});

test("userButton (logged in)", function() {
	var el = $("<div />")[0];
	var task = $("<div />").attr("task", "user").text("foo").appendTo(el);
	backstage.tiddlyspace.userButton(el, { name: "james" });
	var user = $("[task=user]", el);
	strictEqual(user.length, 1);
	strictEqual(user.text(), "user: james");
	strictEqual($("[site-icon=james]", el).length, 1);
});

test("userButton (not logged in)", function() {
	var el = $("<div />")[0];
	var task = $("<div />").attr("task", "user").text("foo").appendTo(el);
	backstage.tiddlyspace.userButton(el, { anon: true });
	var user = $("[task=user]", el);
	strictEqual(user.length, 0);
});

test("spaceButton", function() {
	var el = $("<div />")[0];
	var task = $("<div />").attr("task", "space").text(":D").appendTo(el);
	backstage.tiddlyspace.spaceButton(el);
	var space = $("[task=space]", el);
	strictEqual(space.length, 1);
	strictEqual(space.text(), "space: foo");
	strictEqual($("[site-icon=foo]", el).length, 1);
});

test("tweakMiddleButton (unsynced changes exist)", function() {
	backstage.tiddlyspace.tweakMiddleButton();
	backstage.tiddlyspace.tweakMiddleButton("unsyncedIcon");
	strictEqual($(".iconContainer[image=unsyncedIcon]").length, 1, "also checking it empties container at beginning");
});

test("tweakMiddleButton (edit mode)", function() {
	backstage.tiddlyspace.tweakMiddleButton();
	strictEqual(readOnly, false);
	strictEqual($(".iconContainer[image=privateAndPublicIcon]").length, 1, "also checking it empties container at beginning");
});

test("checkSyncStatus (ui) with unsynced tiddlers", function() {
	backstage.tiddlyspace.checkSyncStatus();
	strictEqual($("#backstagePanel.unsyncedChanges .unsyncedList").length, 0);
	strictEqual($(".iconContainer[image=privateAndPublicIcon]").length, 1, "note filterTiddlers returns no tiddlers");
});

test("followSpace paramifiedLink", function() {
	var container = $("<span />")[0];
	config.macros.followSpace.paramifiedLink(container, "foo", "bar", "abc", "newTiddler");
	var link = $("a", container);
	strictEqual(link.attr("href"), "http://foo.tiddlyspace.com/#newTiddler:[[bar]]");
	strictEqual(link.text(), "abc");
});

test("followSpace make", function() {
	var container = $("<span />")[0];
	config.macros.followSpace.make(container, "jerm", "bob");
	var link = $("a", container);
	strictEqual(link.attr("href"), "http://jerm.tiddlyspace.com/#follow:[[@bob]]");
	strictEqual(link.text(), "follow bob");
})

module("TiddlySpaceBackstage plugin - unplugged tests", {
	setup: function() {
		_unplugged = config.unplugged;
		config.unplugged =  true;
		_avatar = config.extensions.tiddlyspace.renderAvatar;
		config.extensions.tiddlyspace.renderAvatar = function(el, name){
			$(el).attr("site-icon", name);
		};
	},
	teardown: function() {
		config.extensions.tiddlyspace.renderAvatar = _avatar;
		config.unplugged = _unplugged;
	}
});

test("userButton (not logged in and unplugged)", function() {
	var el = $("<div />")[0];
	var task = $("<div />").attr("task", "user").text("foo").appendTo(el);
	backstage.tiddlyspace.userButton(el, { anon: true });
	var user = $("[task=user]", el);
	strictEqual(user.text(), config.tasks.user.unpluggedText);
});

test("spaceButton (unplugged)", function() {
	var el = $("<div />")[0];
	var task = $("<div />").attr("task", "space").text(":D").appendTo(el);
	backstage.tiddlyspace.spaceButton(el);
	var space = $("[task=space]:hidden", el);
	strictEqual(space.length, 1);
});

})(QUnit.module, jQuery);
