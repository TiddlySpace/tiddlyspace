/***
|''Name''|TiddlySpaceFormsPlugin|
|''Version''|0.2.1|
|''Requires''|TiddlySpaceConfig|
!Code
***/
//{{{
(function($) {
var tiddlyspace = config.extensions.tiddlyspace;
var ext = config.extensions.formMaker = {
	locale: {
		submit: "submit",
		sending: "submitting the form...",
		error: "an error occurred",
		tryAgain: "try again"
	},
	localise: function(i, locale) {
		return locale[i] || ext.locale[i];
	},
	reset: function(form) {
		$(".annotation", form).removeClass("annotation");
		$(".messageArea", form).empty().removeClass("error").hide();
		$(".inputArea", form).show();
	},
	doSubmit: function(form, locale) {
		$(".inputArea", form).hide();
		$(".messageArea", form).text(ext.localise("sending", locale)).show(100);
	},
	displayMessage: function(form, msg, error, options) {
		options = options || {};
		if(options.hideForm) {
			$(".inputArea", form).hide();
		} else {
			$(".inputArea", form).show();
		}
		var msgArea = $(".messageArea", form);
		msgArea.html(msg || ext.locale.error).show(100);
		if(error) {
			msgArea.addClass("error annotation");
		}
		if(options.annotate) {
			$(options.annotate, form).addClass("annotation");
		}
		var container = $("<div />").appendTo(msgArea)[0];
		$("<a />").text(ext.locale.tryAgain).click(function(ev) {
				var form = $("form", $(ev.target).parents());
				ext.reset(form);
			}).appendTo(container);
	},
	make: function(container, elements, handler, options) {
		options = options || {};
		var locale = options.locale || {};
		var form = $("<form />").appendTo(container)[0];
		var token = tiddlyspace.getCSRFToken();
		if(token) {
			$("<input />").attr("type", "hidden").attr("name", "csrf_token").val(token).appendTo(form);
		}
		if(options.className) {
			$(form).addClass(options.className);
		}
		$("<div />").addClass("annotation messageArea").hide().appendTo(form);
		var inputArea = $("<div />").addClass("inputArea").appendTo(form);
		var inputs = 0;
		for(var i = 0; i < elements.length; i++) {
			var el = elements[i];
			if(typeof(el) == "string") {
				$("<div />").addClass("label").text(el).appendTo(inputArea);
			} else if(el) {
				if(el.type && ["password", "hidden"].contains(el.type)) {
					el._typeAttr = "type='%0'".format(el.type);
					el.type = "input";
				} else if(!el.type) {
					el.type = "input";
				}
				var name;
				if(el.name) {
					name = el.name;
				} else {
					name = "input" + inputs;
					inputs += 1;
				}
				var input = $('<%0 %1/>'.format(el.type, el._typeAttr)).addClass("form-" + el.type).
					attr("name", name).appendTo(inputArea)[0];
				if(el.type == "select") {
					$(el.values).each(function(i, def) {
						$("<option />").text(def[0]).val(def[1]).appendTo(input);
					});
				}
				var value = el.value || "";
				$(input).val(value);
			}
		}
		if(typeof(handler) == "string") {
			$(form).attr("action", handler).attr("method", "post");
			handler = function(ev, form) {
				form.submit();
			};
		}
		var submitHandler = function(ev) {
			if(options.beforeSubmit) {
				options.beforeSubmit(ev, form);
			}
			ev.preventDefault();
			ext.reset();
			ext.doSubmit(form, locale);
			handler(ev, form);
		};
		$(form).submit(submitHandler);
		$("<input />").attr("type", "submit").val(ext.localise("submit", locale)).click(submitHandler).appendTo(inputArea);
		return form;
	}
};

})(jQuery);
//}}}
