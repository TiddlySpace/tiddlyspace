(function(module, $) {

var _getTiddler, locale, _createTiddlyButton;
module("EditConflictHandler plugin", {
	setup: function() {
		locale = config.messages.editConflict;
		config.messages.editConflict = {
			diffFieldsHeader: "slide",
			diffHeader: "header"
		};
		$("<div />").attr("id", "editConflictTests").appendTo(document.body);
		story.getTiddler = function() {
			return $("#editConflictTests")[0];
		}
		_getTiddler = story.getTiddler;
		var tiddler = new Tiddler("EditConflictTesting");
		store.saveTiddler(tiddler);
		$("<div />").attr("id", "editTestArea").appendTo(document.body);
		_createTiddlyButton = createTiddlyButton;
		createTiddlyButton = function(container) {
			return $("<a />").appendTo(container)[0];
		}
	},
	teardown: function() {
		$("#editConflictTests").remove();
		story.getTiddler = _getTiddler;
		config.messages.editConflict = locale;
		store.removeTiddler("diff1");
		store.removeTiddler("diff2");
		store.removeTiddler("EditConflictTesting");
		$("#editTestArea").remove();
		createTiddlyButton = _createTiddlyButton;
	}
});

test("reportError", function() {
	var ext = config.extensions.errorHandler;
	var el = ext.reportError("foo");
	strictEqual($(el).hasClass("annotation"), true, "check report has annotation class");
	strictEqual($(el.parentNode).attr("id"), "editConflictTests", "check the parent node is the story tiddler element");
});

test("getDiffTiddlerTexts", function() {
	var ext = config.extensions.errorHandler;
	var texts = ext.getDiffTiddlerTexts("  field: foo\nfield2: bar\n  \nthe text");
	strictEqual(texts[0], '{{diff{\nthe text\n}}}',
		"check the text of the diff of the text");
	strictEqual(texts[1], "{{diff{\n  field: foo\nfield2: bar\n}}}", "check text of fields diff");
});

test("resetToServerVersion", function() {
	var ext = config.extensions.errorHandler;
	var asExpected = false;
	var tiddler = new Tiddler("X");
	tiddler.fields["server.host"] = "http://tiddlyspace.com";
	tiddler.fields["server.bag"] = "bar";
	tiddler.getAdaptor = function() {
		return {
			getTiddler: function(title, ctx, params, callback) {
				if(ctx.workspace == "bags/bar" && ctx.host == "http://tiddlyspace.com") {
					asExpected = true;
				}
			}
		};
	};
	ext.resetToServerVersion(tiddler);
	strictEqual(asExpected, true);
});

test("editConflictHandler", function() {
	var ext = config.extensions.errorHandler;
	var container = $("#editTestArea")[0]
	var tiddler = store.getTiddler("EditConflictTesting");
	ext.editConflictHandler(container, tiddler);
	var buttons = $("a", container);
	strictEqual(buttons.length, 3);
	strictEqual($(buttons[0]).data("title"), "EditConflictTesting");
})

test("makeDiffTiddler", function() {
	var ext = config.extensions.errorHandler;
	var tid1 = ext.makeDiffTiddler("diff1", true);
	var tid2 = ext.makeDiffTiddler("diff2", false);
	strictEqual(tid1.tags.contains("diff"), true);
	strictEqual(tid1.fields["server.workspace"],
		config.defaultCustomFields["server.workspace"]);
	strictEqual(tid2.tags.contains("diff"), false);
	strictEqual(tid2.fields.doNotSave, true);
});

})(QUnit.module, jQuery);
