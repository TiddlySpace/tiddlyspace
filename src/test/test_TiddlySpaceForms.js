(function(module, $) {

var form, container, macro, _getCSRFToken;
module("TiddlySpaceForms plugin", {
	setup: function() {
		container = $("<div />").appendTo(document.body)[0];
		macro = config.extensions.formMaker;
		form = $("<form />").appendTo(document.body)[0];
		_getCSRFToken = config.extensions.tiddlyspace.getCSRFToken;
		config.extensions.tiddlyspace.getCSRFToken = function() {
			return "blaglag"
		};
	},
	teardown: function() {
		$(form).remove();
		$(container).remove();
		macro = null;
		config.extensions.tiddlyspace.getCSRFToken = _getCSRFToken;
	}
});

test("localise", function() {
	var res = macro.localise("submit", {});
	var res2 = macro.localise("submit", { submit: "hello" });
	strictEqual(res, "submit");
	strictEqual(res2, "hello");
});

test("reset", function() {
	$("<div />").addClass("annotation").appendTo(form);
	$("<div />").addClass("messageArea").text("there has been an error").appendTo(form);
	$("<div />").addClass("inputArea").hide().appendTo(form);
	macro.reset(form);
	strictEqual($(".messageArea", form).text(), "", "Should clear any error messages...");
	strictEqual($(".annotation", form).length, 0, "... remove annotations ...");
	strictEqual($(".inputArea:hidden", form).length, 0, "... unhide inputArea");
});

test("doSubmit", function() {
	$("<div />").addClass("messageArea").text("please make use of the form").appendTo(form);
	$("<div />").addClass("inputArea").appendTo(form);
	macro.doSubmit(form, { sending: "sending the form for test" });
	strictEqual($(".inputArea:hidden", form).length, 1, "hide inputArea...");
	strictEqual($(".messageArea", form).text(), "sending the form for test", "... show the feedback message localised");
});

test("displayMessage default error behaviour", function() {
	var c = $("<div />").addClass("messageArea").text("please make use of the form").appendTo(form);
	$("<div />").addClass("foo").appendTo(form);
	$("<div />").addClass("bar").appendTo(form);
	$("<div />").addClass("inputArea").appendTo(form);
	macro.displayMessage(form, "hello world this is an error", true);
	strictEqual($(".inputArea:hidden", form).length, 0, "the form doesn't get hidden");
	strictEqual($(".messageArea.error", form).length, 1, "error flag set");
});

test("displayMessage non-error", function() {
	var c = $("<div />").addClass("messageArea").text("please make use of the form").appendTo(form);
	$("<div />").addClass("foo").appendTo(form);
	$("<div />").addClass("bar").appendTo(form);
	$("<div />").addClass("inputArea").appendTo(form);
	macro.displayMessage(form, "hello world this is not an error", false, { annotate: ".foo", hideForm: true });
	strictEqual($(".inputArea:hidden", form).length, 1, "the form gets hidden as hideForm is set");
	strictEqual($(".foo.annotation", form).length, 1,
		"foo gets annotated as it matches selector given in annotate option");
	strictEqual($(".error", form).length, 0, "no error");
});

test("make (basic)", function() {
	macro.make(container, [], "test.html", {});
	strictEqual($("form", container).length, 1, "a form was created");
	strictEqual($("input[name=csrf_token]", container).length, 1, "csrf token added if available");
	strictEqual($("input[type=submit]", container).length, 1,
		"a submit button was added (this makes enter key work)");
	strictEqual($("form", container).attr("method"), "post", "post as string passed as 3rd argument");
	strictEqual($("form", container).attr("action"), "test.html", "3rd argument set as action");
});

test("make (input)", function() {
	macro.make(container, [ { name: "foo" } ], "test.html", {});
	strictEqual($("form", container).length, 1, "a form was created");
	strictEqual($("input[name=csrf_token]", container).length, 1, "csrf token added to all form creations");
	strictEqual($("input[name=foo]", container).length, 1, "input added (no type given)");
});

test("make (input hidden)", function() {
	macro.make(container, [ { name: "bar", type: "hidden", value:"hello" } ], "test.html", {});
	var input = $("input[type=hidden][name=bar]", container);
	strictEqual(input.length, 1, "input added");
	strictEqual(input.val(), "hello", "value set");
});

test("make (input hidden)", function() {
	macro.make(container, [ { name: "bar", type: "hidden", value:"hello" } ], "test.html", {});
	var input = $("input[type=hidden][name=bar]", container);
	strictEqual(input.length, 1, "input added");
	strictEqual(input.val(), "hello", "value set");
});

test("make (select)", function() {
	macro.make(container, [ { name: "bar", type: "select", values: [["n1", "v1"], ["n2", "v2"]] } ], "test.html", {});
	var select = $("select[name=bar]", container);
	var options = $("option", select);
	strictEqual(select.length, 1, "select added");
	strictEqual(options.length, 2, "two options");
	strictEqual($(options[0]).val(), "v1");
	strictEqual($(options[0]).text(), "n1");
	strictEqual($(options[1]).val(), "v2");
	strictEqual($(options[1]).text(), "n2");
});

test("make (callback)", function() {
	var testOK, callbackRun;
	var callback = function(ev, form) {
		callbackRun = true;
		if($("input[name=bar]", form).val() == "hello") {
			testOK = true;
		}
	};
	var myForm = macro.make(container, [ { name: "bar", type: "hidden", value:"hello" } ], callback, {});
	$(myForm).submit();
	strictEqual(callbackRun, true, "the callback was run");
	strictEqual(testOK, true, "able to access form elements");
});

test("make (test beforeSend)", function() {
	var testOK, beforeSubmitRun;
	var callback = function(ev, form) {
		if(beforeSubmitRun) {
			testOK = true;
		}
	};
	var beforeSubmit = function(ev, form) {
		beforeSubmitRun = true;
	};

	var myForm = macro.make(container, [], callback, { beforeSubmit: beforeSubmit });
	$(myForm).submit();
	strictEqual(testOK, true, "the beforeSubmit ran before the form was submitted");
});

})(QUnit.module, jQuery);
