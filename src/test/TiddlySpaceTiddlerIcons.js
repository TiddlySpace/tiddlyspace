(function(module, $) {

var _renderImage, _Popup, _binaryTiddlersPlugin, _getArguments;
var mockRenderImage = function(place, src, options) {
	options = options ? options : {};
	var link = options.link || "";
	var tiddlyLink = options.tiddlyLink || "";
	$("<span />").addClass("imageStub").text(src).attr("link", link).
		attr("tiddlyLink", tiddlyLink).appendTo(place);
};

var _format;
module("TiddlySpaceTiddlerIcons", {
	setup: function() {
		_format = String.prototype.format;
		String.prototype.format = function(str) {
			if(typeof(str) !== "string") {
				return str;
			} else {
				return _format.apply(this, arguments);
			}
		}
		var popup = $("<div />").attr("id", "test_ttt_popup").appendTo(document.body);
		Popup = {
			create: function(place) {
				this.el = popup;
				return document.getElementById("test_ttt_popup");
			},
			show: function() {
				$(this.el).show();
				this.hidden = false;
			},
			remove: function() {
				this.hidden = true;
			}
		}
		_Popup = Popup;
		_binaryTiddlersPlugin = config.extensions.BinaryTiddlersPlugin;
		config.extensions.BinaryTiddlersPlugin = {
			endsWith: function(str, substr) {
				var isPrivate = substr == "_private";
				var isPublic = substr == "_public";
				if(str == "bar_public" && isPublic) {
					return true
				} else if(str == "dog_private" && isPrivate) {
					return true;
				} else if(str == "jon_public" && isPublic) {
					return true;
				} else if(str == "jon_private" && isPrivate) {
					return true;
				} else if(str == "bob-is-the-man_private" && isPrivate) {
					return true;
				} else if(str == "bob_public" && isPublic) {
					return true;
				} else {
					return false;
				}
			}
		};
		_getArguments = config.macros.image.getArguments;
		_renderImage = config.macros.image.renderImage;
		config.macros.image.renderImage = mockRenderImage;
		config.macros.image.getArguments = function() {
			return {};
		};
	},
	teardown: function() {
		String.prototype.format = _format;
		config.macros.image.getArguments = _getArguments;
		store.removeTiddler("foo");
		store.removeTiddler("foo2");
		store.removeTiddler("boo [public]");
		var popup = document.getElementById("test_ttt_popup");
		if(popup) {
			popup.parentNode.removeChild(popup);
		}
		Popup = _Popup;
		config.macros.image.renderImage = _renderImage;
		config.extensions.BinaryTiddlersPlugin.endsWith = _binaryTiddlersPlugin;
	}
});

test("resolveSpaceName", function() {
	var tiddlyspace = config.extensions.tiddlyspace;
	var name = tiddlyspace.resolveSpaceName("@jon");
	var name2 = tiddlyspace.resolveSpaceName("jon_public");
	var name3 = tiddlyspace.resolveSpaceName("jon_private");
	var name4 = tiddlyspace.resolveSpaceName("bob-is-the-man_private");
	var name5 = tiddlyspace.resolveSpaceName("bob");
	var name6 = tiddlyspace.resolveSpaceName("BeNgIlLiEs");
	var name7 = tiddlyspace.resolveSpaceName("bags/bob_public");
	var name8 = tiddlyspace.resolveSpaceName("recipes/bob_public");

	strictEqual(name, "jon");
	strictEqual(name2, "jon");
	strictEqual(name3, "jon");
	strictEqual(name4, "bob-is-the-man");
	strictEqual(name5, "bob");
	strictEqual(name6, "bengillies");
	strictEqual(name7, "bob");
	strictEqual(name8, "bob");
});

test("render avatar", function() {
	var tiddlyspace = config.extensions.tiddlyspace;
	var place = $("<div />");

	tiddlyspace.renderAvatar(place, "jon", { spaceLink: true, labelOptions: { include: false, prefix: "hello " } });
	tiddlyspace.renderAvatar(place, "@foo", { spaceLink: true, labelOptions: {include: true } });
	tiddlyspace.renderAvatar(place, "bar_public", {
		labelOptions: { include: true, prefix: "from space ", suffix: " !!"}
	});
	tiddlyspace.renderAvatar(place, "dog_private");
	tiddlyspace.renderAvatar(place, "CarRot");
	tiddlyspace.renderAvatar(place, "system", { notSpace: true });
	tiddlyspace.renderAvatar(place, false);
	var res = $(".imageStub", place);
	strictEqual(res.length, 6); // last one didnt render
	strictEqual($(res[0]).text(), "http://jon.tiddlyspace.com/bags/jon_public/tiddlers/SiteIcon");
	strictEqual($(res[0]).attr("link"), "http://jon.tiddlyspace.com");
	strictEqual($(res[1]).text(), "http://foo.tiddlyspace.com/bags/foo_public/tiddlers/SiteIcon");
	strictEqual($(res[1]).attr("link"), "");
	strictEqual($(res[2]).text(), "http://bar.tiddlyspace.com/bags/bar_public/tiddlers/SiteIcon");
	strictEqual($(res[3]).text(), "http://dog.tiddlyspace.com/bags/dog_public/tiddlers/SiteIcon");
	strictEqual($(res[4]).text(), "http://carrot.tiddlyspace.com/bags/carrot_public/tiddlers/SiteIcon");
	strictEqual($(res[5]).text(), "http://tiddlyspace.com/bags/tiddlyspace/tiddlers/SiteIcon");

	var siteIcons = $(".siteIcon", place);
	var jonIcon = $(siteIcons[0]);
	strictEqual(jonIcon.attr("title"), "hello jon");
	strictEqual($(".label", jonIcon).length, 0);
	var fooLabel = $(".label", siteIcons[1]);
	strictEqual(fooLabel.length, 1);
	strictEqual(fooLabel.text(), "foo");
	var barLabel = $(".label", siteIcons[2]);
	strictEqual(barLabel.text(), "from space bar !!");
});

test("confirm", function() {
	var macro = config.macros.tiddlerOrigin;
	var place = $("<div />");
	var ev = {
		target: place,
		stopPropagation: function(){}
	};
	// run
	var clicked = false;
	macro.confirm(ev, "hello", function(ev) {
		clicked = true;
	});
	place = document.getElementById("test_ttt_popup");
	strictEqual($(".message", place).text(), "hello");
	strictEqual($("button", place).length, 2);
	var yes = $("button", place)[0];
	var no = $("button", place)[1];
	no.click();
	strictEqual(Popup.hidden, true);

	strictEqual(clicked, false);
	yes.click();
	strictEqual(clicked, true);

});

test("getOptions", function() {
	var macro = config.macros.tiddlerOrigin;
	var a = {
		parseParams: function(arg) {
			return [
				{
					name: ["foo"],
					interactive: ["no"],
					spaceLink: ["yes"]
				}
			];
		}
	};
	var b = {
		parseParams: function(arg) {
			return [
				{
					name: ["foo"],
					spaceLink: ["yes"]
				}
			];
		}
	};
	var options = macro.getOptions(a);
	var options2 = macro.getOptions(b);

	strictEqual(options.noclick, true);
	strictEqual(options.spaceLink, false);
	strictEqual(options2.noclick, false);
	strictEqual(options2.spaceLink, true);
});

test("_getLabelOptions", function() {
	var macro = config.macros.tiddlerOrigin;

	var options = macro._getLabelOptions([{}]);
	var options2 = macro._getLabelOptions([{ label: ["yes"] }]);
	var options3 = macro._getLabelOptions([{ label: ["no"], width: ["20"], height: ["20"],
		labelPrefix: ["foo"], labelSuffix: ["bar"] }]);
	strictEqual(options.include, true); // make sure its the default
	strictEqual(options2.include, true);
	strictEqual(options3.include, false);
	strictEqual(options3.include, false);
	strictEqual(options3.prefix, "foo");
	strictEqual(options3.suffix, "bar");
});

var _readOnly;
module("TiddlySpaceTiddlerIcons readOnly mode", {
	setup: function() {
		_readOnly = readOnly;
		readOnly = true;
		_renderImage = config.macros.image.renderImage;
		config.macros.image.renderImage = mockRenderImage;
		store.saveTiddler(new Tiddler("missingIcon"));
	},
	teardown: function() {
		readOnly = _readOnly;
		config.macros.image.renderImage = _renderImage;
		store.removeTiddler("missingIcon");
	}
});

test("render avatar (missing icon)", function() {
	var place = $("<div />");
	config.extensions.tiddlyspace.renderAvatar(place, false);
	strictEqual($(".imageStub", place).text(), "missingIcon");
});

test("check concertina commands do not appear in readonly mode", function() {
	// setup
	var macro = config.macros.tiddlerOrigin;
	var place1 = $("<div />")[0];
	var place2 = $("<div />")[0];
	var tiddler = new Tiddler("foo");
	tiddler.getAdaptor = function() {
		return function() {};
	};
	// run
	macro.iconCommands.public(place1, tiddler);
	macro.iconCommands.private(place2, tiddler);

	// verify
	var selector = "input[type=checkbox], .publishButton";
	strictEqual($(selector, place1).length, 0);
	strictEqual($(selector, place2).length, 0);

});

var dirtyReported;
var _reportDirty, _dirty;
module("TiddlySpaceTiddlerIcons (dirty)", {
	setup: function() {
		_reportDirty = config.macros.tiddlerOrigin.reportDirty;
		dirtyReported = false;
		config.macros.tiddlerOrigin.reportDirty = function() {
			dirtyReported = true;
		}
		_dirty = story.isDirty;
		story.isDirty = function(title) {
			if(title == "jack") {
				return true;
			} else {
				return false;
			}
		};
	},
	teardown: function() {
		config.macros.tiddlerOrigin.reportDirty = _reportDirty;
		story.isDirty = _dirty;
	}
});

test("check publishing is not possible from dirty tiddler", function() {
	// to do.
	var originMacro = config.macros.tiddlerOrigin;
	var ev = { target: document.createElement("div") };
	originMacro.iconCommands["public"](ev, new Tiddler("jack"));
	strictEqual(dirtyReported, true);
});

})(QUnit.module, jQuery);
