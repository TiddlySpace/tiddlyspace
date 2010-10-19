(function(module, $) {

var _image, _binaryTiddlersPlugin, _avatar;
module("TiddlySpaceBackstage plugin", {
	setup: function() {
		_image = config.macros.image;
		_avatar = config.extensions.tiddlyspace.renderAvatar;
		config.macros.image.renderImage = function(el, src) {
			$(el).attr("image", src);
		};
		
		config.extensions.tiddlyspace.renderAvatar = function(el, name){
			$(el).attr("site-icon", name);
		};
		
	},
	teardown: function() {
		config.macros.image = _image;
		config.extensions.BinaryTiddlersPlugin = _binaryTiddlersPlugin;
		config.extensions.tiddlyspace.renderAvatar = _avatar;
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

})(QUnit.module, jQuery);
