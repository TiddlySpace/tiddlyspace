(function(module, $) {

module("BinaryUploadPlugin", {
	setup: function() {
	},
	teardown: function() {
	}
});

test("renderInputFields", function() {
	var macro = config.macros.binaryUpload;
	var container = $("<div />")[0];
	macro.renderInputFields(container, { edit: ["tags", "title"], title: ["hello"] });
	var titleEl = $("input[name=title]", container);
	strictEqual(titleEl.length, 1);
	strictEqual(titleEl.val(), "hello");
	strictEqual($("input[name=tags]", container).length, 1);
});

test("renderInputFields", function() {
	var macro = config.macros.binaryUpload;
	var container = $("<div />")[0];
	macro.renderInputFields(container, { edit: [], title: ["hello world"] });
	var titleEl = $("input[name=title][type=hidden]", container);
	strictEqual(titleEl.length, 1);
	strictEqual(titleEl.val(), "hello world");
	strictEqual($("input[name=tags]", container).length, 0);
});

})(QUnit.module, jQuery);
