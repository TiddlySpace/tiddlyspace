/***
|''Name''|TiddlySpaceSpaces|
|''Version''|0.6.0|
|''Description''|TiddlySpace spaces management|
|''Status''|@@beta@@|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/raw/master/src/plugins/TiddlySpaceSpaces.js|
|''CoreVersion''|2.6.1|
|''Requires''|TiddlyWebConfig TiddlySpaceInclusion TiddlySpaceAdmin|
!Code
***/
//{{{
(function($) {

var tweb = config.extensions.tiddlyweb;
var formMaker = config.extensions.formMaker;

var macro = config.macros.TiddlySpaceSpaces = { // TODO: rename
	formTemplate: store.getTiddlerText(tiddler.title + "##HTMLForm"),
	locale: {
		listError: "error listing spaces: %0",
		submit: "Create space",
		addSuccess: "created space %0",
		noSpaces: "You have no spaces",
		sending: "Creating your new space...",
		loadingSpaces: "Wait while we load your spaces...",
		anon: "Login to view your spaces",
		errors:  { 409: "space <em>%0</em> already exists",
			"409a": "error: invalid space name - must start with a letter, be " +
				"at least two characters in length and only contain lowercase " +
				"letters, digits or hyphens" }
	},

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var container = $("<div />").appendTo(place);
		var args = paramString.parseParams("anon")[0];
		var mode = args.anon ? args.anon[0] : "list";
		if(mode == "add") {
			var options = {
				subscribe: args.subscribe ? true : false
			};
			this.generateForm(container, options);
		} else {
			this.refresh(container);
		}
	},
	refresh: function(container) {
		container = $(container);
		container.text(macro.locale.loadingSpaces).addClass("inProgress").
			attr("refresh", "macro").attr("macroName", "TiddlySpaceSpaces").
			addClass("listTiddlySpaceSpaces");
		tweb.getUserInfo(function(user) {
			if(!user.anon) {
				$.ajax({ // XXX: DRY; cf. TiddlySpaceInclusion
					url: tweb.host + "/spaces?mine=1",
					type: "GET",
					success: function(data, status, xhr) {
						container.empty().removeClass("inProgress").append("<ul />");
						var spaces = $.map(data, function(item, i) {
							var link = $("<a />", {
								href: item.uri,
								text: item.name
							});
							return $("<li />").append(link)[0];
						});
						var el = $("ul", container);
						if(data.length > 0) {
							el.append(spaces);
						} else { // XXX: should never occur!?
							$('<p class="annotation" />').text(macro.locale.noSpaces).
								replaceAll(el);
						}
					},
					error: function(xhr, error, exc) {
						displayMessage(macro.locale.listError.format(error));
					}
				});
			} else {
				container.text(macro.locale.anon).addClass("annotation");
			}
		});
	},
	elements: [ "Name:", { name: "space" }, { type: "checkbox", name: "subscribe",
		label: "Include the current space in the new space." }],
	generateForm: function(container, options) {
		formMaker.make(container, macro.elements, macro.onSubmit, { locale: macro.locale });
		if(options.subscribe) {
			$("[name=subscribe]", container).attr("checked", true);
		}
	},
	onSubmit: function(ev) {
		var target = ev.target;
		var form = $(target).closest("form");
		var container = form.closest("div");
		$(".annotation", container).hide();
		$(".error", container).removeClass("error");
		var statusMessage = $(".status", container);
		var space = form.find("[name=space]").val();
		var subscribe = form.find("[name=subscribe]").attr("checked");
		space = new tiddlyweb.Space(space, tweb.host);
		var ns = config.extensions.tiddlyspace;
		var callback = function(resource, status, xhr) {
			if(subscribe) {
				config.macros.TiddlySpaceInclusion.inclusion(
					ns.currentSpace.name, space.name);
			}
			$(".listTiddlySpaceSpaces").each(function(i, el) {
				refreshElements(el.parentNode);
			});
			$("input[type=text]", form).val("");
			formMaker.reset();
		};
		var errback = function(xhr, error, exc) { // TODO: DRY (cf. TiddlySpaceLogin)
			formMaker.displayError(form[0], xhr.status, macro.locale.errors, { selector: "[name=space]", format: [ space.name ] });
		};
		if(ns.isValidSpaceName(space.name)) {
			space.create(callback, errback);
		} else {
			formMaker.displayError(form[0], "409a", macro.locale.errors, { selector: "[name=space]" });
		}
		return false;
	}
};

})(jQuery);
//}}}
