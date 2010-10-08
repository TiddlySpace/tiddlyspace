(function(module, $) {

var _renderImage, _Popup, _binaryTiddlersPlugin, _getArguments;
var mockRenderImage = function(place, src, options) {
	$("<span />").addClass("imageStub").text(src).appendTo(place);
};

module("TiddlySpaceTiddlerIcons", {
	setup: function() {
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
				if(str == "bar_public" && substr == "_public") {
					return true
				} else if(str == "dog_private" && substr == "_private") {
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

test("render avatar", function() {
	var place = $("<div />");
	
	config.extensions.tiddlyspace.renderAvatar(place, "jon", { labelOptions: { include: false, prefix: "hello " } });
	config.extensions.tiddlyspace.renderAvatar(place, "@foo");
	config.extensions.tiddlyspace.renderAvatar(place, "bar_public", { 
		labelOptions: { include: true, prefix: "from space ", suffix: " !!"} 
	});
	config.extensions.tiddlyspace.renderAvatar(place, "dog_private");
	config.extensions.tiddlyspace.renderAvatar(place, "CarRot");
	config.extensions.tiddlyspace.renderAvatar(place, "system", { notSpace: true });
	config.extensions.tiddlyspace.renderAvatar(place, false);
	var res = $(".imageStub", place);
	strictEqual(res.length, 6); // last one didnt render
	strictEqual($(res[0]).text(), "http://jon.tiddlyspace.com/bags/jon_public/tiddlers/SiteIcon");
	strictEqual($(res[1]).text(), "http://foo.tiddlyspace.com/bags/foo_public/tiddlers/SiteIcon");
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
