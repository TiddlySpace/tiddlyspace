/***
|''Name''|TiddlySpaceSpaces|
|''Version''||
|''Description''||
|''Requires''|TiddlyWebConfig TiddlySpaceInclusion TiddlySpaceUserControls|
|''Source''||
!HTMLForm
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
		<p class="annotation" />
		<input type="submit" />
	</fieldset>
</form>
!Code
***/
//{{{
(function($) {

var host = config.extensions.tiddlyweb.host;

var macro = config.macros.TiddlySpaceSpaces = { // TODO: rename
	formTemplate: store.getTiddlerText(tiddler.title + "##HTMLForm"),
	locale: {
		listError: "error listing spaces: %0",
		addLabel: "Create space",
		addSuccess: "created space %0",
		conflictError: "space <em>%0</em> already exists",
		charError: "error: invalid space name - must only contain lowercase " +
			"letters, digits or hyphens",
		noSpaces: "you have no spaces"
	},

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var container = $("<div />").appendTo(place);
		this.refresh(container);
	},
	refresh: function(container) {
		container.empty().append("<ul />").append(this.generateForm());
		$.ajax({ // XXX: DRY; cf. TiddlySpaceInclusion
			url: host + "/spaces?mine=1",
			type: "GET",
			success: function(data, status, xhr) {
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
				displayMessage(macro.locale.listError.format([error]));
			}
		});
	},
	generateForm: function() {
		return $(this.formTemplate).submit(this.onSubmit).
			find("legend").text(this.locale.addLabel).end().
			find(".annotation").hide().end().
			find("[type=submit]").val(this.locale.addLabel).end();
	},
	onSubmit: function(ev) {
		var form = $(this).closest("form");
		var container = form.closest("div");
		var space = form.find("[name=space]").val();
		var subscribe = form.find("[name=subscribe]").attr("checked");
		space = new tiddlyweb.Space(space, host);
		var displayError = config.macros.TiddlySpaceLogin.displayError;
		var ns = config.extensions.tiddlyspace;
		var callback = function(resource, status, xhr) {
			if(subscribe) {
				config.macros.TiddlySpaceInclusion.include(
					ns.currentSpace.name, space.name);
			}
			var link = $('<a href="javascript:;" />').text(space.name); // TODO: calculate URL
			var el = $("ul", container);
			$("<li />").append(link).hide().appendTo(el).
				slideDown(function() {
					$(this).css("display", ""); // required to neutralize animation remnants
					macro.refresh(container); // XXX: hack to add URL (see above)
				});
		};
		var errback = function(xhr, error, exc) { // TODO: DRY (cf. TiddlySpaceLogin)
			var ctx = {
				msg: { 409: macro.locale.conflictError.format([space.name]) },
				form: form,
				selector: "[name=space]"
			};
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
			displayError(xhr, null, null, ctx);
		}
		return false;
	}
};

})(jQuery);
//}}}
