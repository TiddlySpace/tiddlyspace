(function(module, $) {

var _createTiddlyButton, _createTiddlyLink, _getTiddlyLinkInfo, getTiddlers, _store, _wikify, el, _Popup;
module("GroupBy Plugin", {
	setup: function() {
		config.macros.groupBy.locale.openAllText = "hello";
		el = $("<div />").addClass("templateContainer").appendTo(document.body)[0];
		_Popup = Popup;
		Popup = {
			create: function(src){
				return src;
			},
			show: function(){}
		};
		_store = store;
		_wikify = wikify;
		wikify = function(text, el, b, tiddler) {
			if(text == "1") {
				$(el).text("click me " + tiddler.title);
			} else if(text == "2") {
				$(el).text("item template" + tiddler.title);
			}
		};

		store = {
			getTiddlerText: function (title) {
				if(title == "Templates##Group") {
					return "1";
				} else if(title == "Templates##Item") {
					return "2";
				}
			}
		};
		getTiddlers = function() {
			var tiddlers = [];
			for(var i = 0; i < 10; i++) {
				tiddlers.push(new Tiddler("t"+i))
			}
			tiddlers[0].tags = ["foo", "bar"];
			tiddlers[1].tags = ["foo"];
			tiddlers[2].tags = ["z"];
			tiddlers[2].fields = {foo: "bar", bar: "jack"};
			tiddlers[3].fields = {foo: "bar", bar: "dave"};
			tiddlers[4].fields = {foo: "wazzup", bar: "mike"};
			return tiddlers;
		};
		_getTiddlyLinkInfo = getTiddlyLinkInfo;
		_createTiddlyButton = createTiddlyButton;
		_createTiddlyLink = createTiddlyLink;
		createTiddlyButton = function(place, label) {
			return $("<a />").addClass("button").text(label).appendTo(place)[0];
		};
		createTiddlyLink = function(place) {
			return $("<a />").addClass("tiddlyLink").appendTo(place)[0];
		};
		getTiddlyLinkInfo = function(){
			return { classes: "" };
		};
		var macro = config.macros.groupBy;
		macro.morpher.bar = function(val) {
			if(val) {
				return "ok"
			}
		};
	},
	teardown: function() {
		Popup = _Popup;
		$(el).remove();
		el = null;
		wikify = _wikify;
		store = _store;
		getTiddlyLinkInfo = _getTiddlyLinkInfo;
		createTiddlyButton = _createTiddlyButton;
		createTiddlyLink = _createTiddlyLink;
	}
});

test("isTypeArray", function() {
	var macro = config.macros.groupBy;
	var a1 = macro.isTypeArray({});
	var a2 = macro.isTypeArray([]);
	var a3 = macro.isTypeArray("");
	var a4 = macro.isTypeArray(4);
	strictEqual(a1, false);
	strictEqual(a2, true);
	strictEqual(a3, false);
	strictEqual(a4, false);
	
});

test("_refresh", function() {
	var macro = config.macros.groupBy;
	var place = $("<div />")[0];
	var place2 = $("<div />")[0];
	var place3 = $("<div />")[0];
	var place4 = $("<div />")[0];
	var tiddlers = getTiddlers();
	macro._refresh(place, tiddlers, {field: "tags", exclude: []});
	macro._refresh(place2, tiddlers, {field: "foo", exclude: []});
	macro._refresh(place3, tiddlers, {field: "foo", exclude: ["wazzup"]});
	macro._refresh(place4, tiddlers, {field: "bar", exclude: []});
	var buttons = $(".button", place);
	var buttons2 = $(".button", place2);
	var buttons3 = $(".button", place3);
	var buttons4 = $(".button", place4);
	strictEqual(buttons.length, 3, "three active tags - foo bar and z");
	strictEqual(buttons2.length, 2, "two values for foo -  bar and wazzup");
	strictEqual(buttons3.length, 1, "wazzup excluded in this example");
	strictEqual(buttons3.text(), "bar (2)", "check label");
	strictEqual(buttons4.length, 1, "because of the morpher they all resolve to ok");
	strictEqual(buttons4.text(), "ok (3)", "check label");
});

test("_refresh (with templates)", function() {
	var macro = config.macros.groupBy;
	var place = $("<div />")[0];
	var tiddlers = getTiddlers();
	macro._refresh(place, tiddlers, {field: "tags", exclude: [],
		groupTemplate: "Templates##Group", template: "Templates##Item"});
	var buttons = $(".button", place);
	var zGroup = buttons[2];
	strictEqual($(zGroup).text(), "click me t2", "the group template is run on the first tiddler encountered");
});

test("morpher.server.bag", function() {
	var macro = config.macros.groupBy;
	var a1 = macro.morpher["server.bag"]("jon_public");
	var a2 = macro.morpher["server.bag"](false);
	var a3 = macro.morpher["server.bag"]("blah");
	strictEqual(a1, "jon");
	strictEqual(a2, false);
	strictEqual(a3, "*blah");
});

test("_onClickGroup", function() {
	var ev = {
		target: el,
		stopPropagation: function() {}
	};
	var tiddler = new Tiddler("hello world");
	$(el).data("tiddlers", [ tiddler ]);
	config.macros.groupBy._onClickGroup(ev, { template: "Templates##Item" });
	var items = $("li", el);
	strictEqual(items.length, 5,
	"should be only one tiddler in the popup plus the open all and open with this title, plus 2 list breaks");
	strictEqual($(items[2]).text(), "item templatehello world")
});


})(QUnit.module, jQuery);
