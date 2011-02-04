/***
|''Name''|TiddlySpaceInclusion|
|''Version''|0.6.0|
|''Description''|provides user interfaces for managing TiddlySpace inclusions|
|''Status''|@@beta@@|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/raw/master/src/plugins/TiddlySpaceInclusion.js|
|''Requires''|TiddlySpaceConfig TiddlySpaceAdmin chrjs|
!Code
***/
//{{{
(function($) {

var tweb = config.extensions.tiddlyweb;
var tiddlyspace = config.extensions.tiddlyspace;
var currentSpace = tiddlyspace.currentSpace.name;
var formMaker = config.extensions.formMaker;

var macro = config.macros.TiddlySpaceInclusion = {
	formTemplate: store.getTiddlerText(tiddler.title + "##HTMLForm"),
	locale: {
		submit: "Include space",
		sending: "Including space...",
		addSuccess: "included %0 in %1",
		delPrompt: "Are you sure you want to exclude %0 from the current space?",
		delTooltip: "click to exclude from the space",
		delError: "error excluding %0: %1",
		listError: "error retrieving spaces included in space %0: %1",
		noInclusions: "no spaces are included",
		recursiveInclusions: "Spaces that were included by the removed space and not part of the core TiddlySpace application are highlighted and can be removed manually if wished.",
		reloadPrompt: "The page must be reloaded for inclusion to take effect. Reload now?",
		errors: {
			403: "unauthorized to modify space <em>%1</em>",
			404: "space <em>%1</em> does not exist", // XXX: only relevant for passive mode
			"409a": "space <em>%0</em> is already included in <em>%1</em>",
			"409b": "space <em>%0</em> does not exist"
		}
	},

	elements: ["Space Name:", { name: "space" }],
	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		// passive mode means subscribing given space to current space
		this.name = macroName;
		var mode = params[0] || "list";

		if(mode == "passive") {
			if(!readOnly) {
				formMaker.make(place, macro.elements, macro.onSubmit, { locale: macro.locale });
			}
		} else {
			var container = $("<div />").addClass(this.name).appendTo(place);
			$('<p class="annotation" />').hide().appendTo(container);
			this.listInclusions(container);
		}
	},
	listInclusions: function(container) {
		var recipe = new tiddlyweb.Recipe(currentSpace + "_public", tweb.host);
		recipe.get(function(recipe, status, xhr) {
			var inclusions = $.map(recipe.recipe, function(item, i) { // TODO: refactor to canonicalize; move to TiddlySpaceConfig!?
				var arr = item[0].split("_public");
				return (arr[0] != currentSpace && arr[1] === "") ? arr[0] : null;
			});
			var items = $.map(inclusions, function(item, i) { // TODO: DRY (cf. displayMembers)
				var link = $("<a />").text(item);
				tweb.getStatus(function(status) {
					var uri = tiddlyspace.getHost(
						status.server_host, item);
					link.attr("href", uri);
				});
				var btn = $('<a class="deleteButton" href="javascript:;" />').
					text("x"). // TODO: i18n (use icon!?)
					attr("title", macro.locale.delTooltip).
					data("space", item).click(macro.onDelClick);
				if(readOnly) {
					btn.hide();
				}
				return $("<li />").append(link).append(btn)[0];
			});
			if(items.length) {
				$("<ul />").append(items).appendTo(container);
			} else {
				$('<div class="annotation" />').
					text(macro.locale.noInclusions).appendTo(container);
			}
		}, function(xhr, error, exc) {
			displayMessage(macro.locale.listError.format([currentSpace, error]));
		});
	},
	onSubmit: function(ev, form) {
		var selector = "[name=space]";
		var space = $(form).find(selector).val();
		var provider = space;
		var subscriber = currentSpace;
		var loc = macro.locale;
		var callback = function(data, status, xhr) {
			displayMessage(loc.addSuccess.format([provider, subscriber]));
			if(confirm(loc.reloadPrompt)) {
				window.location.reload();
			}
			formMaker.reset();
		};
		var errback = function(xhr, error, exc) {
			if(xhr.status == 409) {
				var included = "already subscribed";
				xhr = { // XXX: hacky
					status: xhr.responseText.indexOf(included) != -1 ? "409a" : "409b"
				};
			}
			var options = {
				format: [ provider, subscriber ],
				selector: selector
			};
			formMaker.displayError(form, xhr.status, macro.locale.errors, options);
		};
		macro.inclusion(provider, subscriber, callback, errback, false);
		return false;
	},
	onDelClick: function(ev) { // XXX: too long, needs refactoring
		var btn = $(this);
		var provider = btn.data("space");

		var msg = macro.locale.delPrompt.format([provider]);
		var callback = function(data, status, xhr) {
			btn.closest("li").slideUp(function(ev) { $(this).remove(); });
		};
		var errback = function(xhr, error, exc) { // XXX: doesn't actually happen
			displayMessage(macro.locale.delError.format([username, error]));
		};
		if(confirm(msg)) {
			var coreBags = tiddlyspace.coreBags;
			var recipe = new tiddlyweb.Recipe(provider + "_public", tweb.host);
			recipe.get(function(recipe, status, xhr) {
				var inclusions = $.map(recipe.recipe, function(item, i) { // XXX: duplicated from above
					var arr = item[0].split("_public");
					return (arr[0] != provider && arr[1] === "") ? arr[0] : null;
				});
				var recursiveMatch = false;
				btn.closest("ul").find("li").each(function(i, node) {
					var space = $(".deleteButton", node).data("space"); // XXX: relying on button is hacky
					if($.inArray(space, inclusions) != -1 && $.inArray("%0_public".format([space]), coreBags) == -1) {
						recursiveMatch = true;
						$(node).addClass("annotation"); // TODO: proper highlighting
					}
				});
				var annotation = btn.closest("." + macro.name).find("> .annotation");
				if(recursiveMatch) {
					annotation.text(macro.locale.recursiveInclusions).slideDown();
				} else {
					annotation.hide();
				}
			});
			macro.inclusion(provider, currentSpace, callback, errback, true);
		}
		return false;
	},
	inclusion: function(provider, subscriber, callback, errback, remove) {
		var data = {};
		var key = remove ? "unsubscriptions" : "subscriptions";
		data[key] = [provider];
		$.ajax({ // TODO: add to model/space.js?
			url: tweb.host + "/spaces/" + subscriber,
			type: "POST",
			contentType: "application/json",
			data: $.toJSON(data),
			success: callback,
			error: errback
		});
	}
};

})(jQuery);
//}}}
