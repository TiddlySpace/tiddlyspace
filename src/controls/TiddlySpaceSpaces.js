/***
|''Requires''|TiddlyWebConfig TiddlySpaceSubscription|
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
			Subscribe the new space to the current space
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
		conflictError: "space <em>%0</em> already exists"
	},

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var container = $("<div />").appendTo(place);
		this.refresh(container);
	},
	refresh: function(container) {
		container.empty().append("<ul />").append(this.generateForm());
		$.ajax({ // XXX: DRY; cf. TiddlySpaceSubscription
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
				$("ul", container).append(spaces);
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
		var callback = function(resource, status, xhr) {
			if(subscribe) {
				config.macros.TiddlySpaceSubscription.subscribe(
					config.extensions.tiddlyspace.currentSpace.name, space.name);
			}
			macro.refresh(container);
			displayMessage(macro.locale.addSuccess.format([space.name]));
		};
		var errback = function(xhr, error, exc) { // TODO: DRY (cf. TiddlySpaceLogin)
			switch(xhr.status) {
				case 409:
					error = macro.locale.conflictError.format([space.name]);
					break;
				default:
					error = "%0: %1".format([xhr.statusText, xhr.responseText]).
						htmlEncode();
					break;
			}
			var el = $("[name=space]", form).addClass("error").focus(function(ev) {
				el.removeClass("error").unbind(ev.originalEvent.type).
					closest("form").find(".annotation").slideUp();
			});
			$(".annotation", form).html(error).slideDown();
		};
		space.create(callback, errback);
		return false;
	}
};

})(jQuery);
//}}}
