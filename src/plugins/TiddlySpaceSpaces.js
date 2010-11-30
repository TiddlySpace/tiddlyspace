/***
|''Name''|TiddlySpaceSpaces|
|''Version''|0.5.9|
|''Description''|TiddlySpace spaces management|
|''Status''|@@beta@@|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/raw/master/src/plugins/TiddlySpaceSpaces.js|
|''CoreVersion''|2.6.1|
|''Requires''|TiddlyWebConfig TiddlySpaceInclusion TiddlySpaceUserControls|
!HTMLForm
<div class='createSpace'>
	<div class='status'></div>
	<form action="#">
		<fieldset>
			<legend />
			<dl>
				<dt>Name:</dt>
				<dd><input type="text" name="space" /></dd>
			</dl>
			<p>
				<input type="checkbox" name="subscribe" />
				Include the current space in the new space.
			</p>
			<p class="success" />
			<p class="annotation" />
			<input type="submit" />
		</fieldset>
	</form>
</div>
!Code
***/
//{{{
(function($) {

var tweb = config.extensions.tiddlyweb;

var macro = config.macros.TiddlySpaceSpaces = { // TODO: rename
	formTemplate: store.getTiddlerText(tiddler.title + "##HTMLForm"),
	locale: {
		listError: "error listing spaces: %0",
		addLabel: "Create space",
		addSuccess: "created space %0",
		conflictError: "space <em>%0</em> already exists",
		charError: "error: invalid space name - must start with a letter, be " +
			"at least two characters in length and only contain lowercase " +
			"letters, digits or hyphens",
		noSpaces: "You have no spaces",
		addSpace: "Creating your new space...",
		loadingSpaces: "Wait while we load your spaces...",
		anon: "Login to view your spaces"
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
	generateForm: function(container, options) {
		var locale = macro.locale;
		$(this.formTemplate).submit(function(ev) {
			$(".status", container).text(locale.addSpace).show();
			$("form", container).fadeOut("slow");
			ev.preventDefault();
			return macro.onSubmit(ev);
		}).
		find("legend").text(this.locale.addLabel).end().
		find(".annotation").hide().end().
		find("[type=submit]").val(this.locale.addLabel).end().appendTo(container);
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
		var displayError = config.macros.TiddlySpaceLogin.displayError;
		var ns = config.extensions.tiddlyspace;
		var callback = function(resource, status, xhr) {
			if(subscribe) {
				config.macros.TiddlySpaceInclusion.inclusion(
					ns.currentSpace.name, space.name);
			}
			$(".listTiddlySpaceSpaces").each(function(i, el) {
				refreshElements(el.parentNode);
			});
			form.stop(true, true).fadeIn("slow");
			$("input[type=text]", form).val("");
			statusMessage.hide();
		};
		var errback = function(xhr, error, exc) { // TODO: DRY (cf. TiddlySpaceLogin)
			var ctx = {
				msg: { 409: macro.locale.conflictError.format(space.name) },
				form: form,
				selector: "[name=space]"
			};
			form.stop(true, true).fadeIn("slow");
			statusMessage.hide();
			displayError(xhr, error, exc, ctx);
		};
		if(ns.isValidSpaceName(space.name)) {
			space.create(callback, errback);
		} else {
			xhr = { status: 409 }; // XXX: hacky
			var ctx = {
				msg: { 409: macro.locale.charError },
				form: form,
				selector: "[name=space]"
			};
			form.stop(true, true).fadeIn("slow");
			statusMessage.hide();
			displayError(xhr, null, null, ctx);
		}
		return false;
	}
};

})(jQuery);
//}}}
