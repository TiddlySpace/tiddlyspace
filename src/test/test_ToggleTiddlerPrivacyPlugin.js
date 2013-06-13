(function(module, $) {

module("ToggleTiddlerPrivacy plugin", {
	teardown: function() {
		store.removeTiddler("foo");
	}
});

test("setBag (change)", function() {
	// setup
	strictEqual(config.extensions.tiddlyspace.currentSpace.name, "foo", "pre test check that foo is the default space.");
	var macro = config.macros.setPrivacy;
	var tiddler = new Tiddler("foo");
	store.addTiddler(tiddler);
	var el = $("<div />").attr("tiddler", "foo")[0];
	var bagInput = $("<input />").attr("edit", "server.bag").val("foo_private").appendTo(el);
	var workspaceInput = $("<input />").attr("edit", "server.workspace").val("recipes/foo_private").appendTo(el);
	var radioPublic = $("<input />").attr("type", "radio").addClass("isPublic").appendTo(el);
	var radioPrivate = $("<input />").attr("type", "radio").addClass("isPrivate").appendTo(el);

	// run
	macro.setBag(el, "foo_public");

	//test
	tiddler = store.getTiddler("foo");
	strictEqual(bagInput.val(), "foo_public");
	strictEqual(workspaceInput.val(), "bags/foo_public");
	strictEqual(tiddler.fields["server.bag"], "foo_public");
	strictEqual(tiddler.fields["server.workspace"], "bags/foo_public");
	strictEqual(radioPublic.attr("checked"), true);
	strictEqual(radioPrivate.attr("checked"), false);
});

test("setBag", function() {
	// setup
	strictEqual(config.extensions.tiddlyspace.currentSpace.name, "foo", "pre test check that foo is the default space.");
	var macro = config.macros.setPrivacy;
	var tiddler = new Tiddler("foo");
	store.addTiddler(tiddler);
	var el = $("<div />").attr("tiddler", "foo").attr("tiddlyFields", "server.bag: foo_public")[0];
	var bagInput = $("<input />").attr("edit", "server.bag").val("foo_private").appendTo(el);
	var workspaceInput = $("<input />").attr("edit", "server.workspace").val("recipes/foo_private").appendTo(el);
	var radioPublic = $("<input />").attr("type", "radio").addClass("isPublic").appendTo(el);
	var radioPrivate = $("<input />").attr("type", "radio").addClass("isPrivate").appendTo(el);

    strictEqual($(el).attr("tiddlyFields"), "server.bag: foo_public");

	// run
	macro.setBag(el, "foo_private");
	
	//test
	tiddler = store.getTiddler("foo");
	strictEqual(bagInput.val(), "foo_private");
	strictEqual(workspaceInput.val(), "bags/foo_private");
	strictEqual(tiddler.fields["server.bag"], "foo_private");
	strictEqual(tiddler.fields["server.workspace"], "bags/foo_private");
	strictEqual(radioPrivate.attr("checked"), true);
	strictEqual(radioPublic.attr("checked"), false);
	strictEqual($(el).attr("tiddlyFields"), "");
});

test("updateEditFields (custom fields already exist)", function() {
	var macro = config.macros.setPrivacy;
	var el = $("<div />");
	$("<input />").attr("edit", "server.bag").appendTo(el);
	$("<input />").attr("edit", "server.workspace").appendTo(el);
	macro.updateEditFields(el[0], "bar");

	var ws = $('[edit="server.workspace"]', el);
	var b = $('[edit="server.bag"]', el);
	strictEqual(b.length, 1);
	strictEqual(ws.length, 1);
	strictEqual(b.val(), "bar");
	strictEqual(ws.val(), "bags/bar");
});

test("updateEditFields", function() {
	var macro = config.macros.setPrivacy;
	var el = $("<div />");
	macro.updateEditFields(el[0], "bar");

	var ws = $('[edit="server.workspace"]', el);
	var b = $('[edit="server.bag"]', el);
	strictEqual(b.length, 1);
	strictEqual(ws.length, 1);
	strictEqual(b.val(), "bar");
	strictEqual(ws.val(), "bags/bar");
});

var _readOnly;
module("ToggleTiddlerPrivacy plugin", {
	setup: function() {
		_readOnly = readOnly;
		readOnly = true;
	},
	teardown: function() {
		readOnly = _readOnly;
	}
});

test("hidden in readonly mode", function() {
	var place = $("<div />")[0];
	config.macros.setPrivacy.handler(place);
	strictEqual($(place).children().length, 0);
});

})(QUnit.module, jQuery);
