/***
|''Requires''|TiddlyWebConfig|
!HTMLForm
<form action="#">
	<fieldset>
		<legend />
		<dl>
			<dt>Name:</dt>
			<dd><input type="text" name="space" /></dd>
		</dl>
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
		addError: "error creating space %0: %1"
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
						href: "http://%0.tiddlyspace.com".format([item]), // XXX: hardcoded
						text: item
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
			find("[type=submit]").val(this.locale.addLabel).end();
	},
	onSubmit: function(ev) {
		var form = $(this).closest("form");
		var container = form.closest("div");
		var space = form.find("[name=space]").val();
		space = new tiddlyweb.Space(space, host);
		var callback = function(resource, status, xhr) {
			macro.refresh(container);
			displayMessage(macro.locale.addSuccess.format([space.name]));
		};
		var errback = function(xhr, error, exc) {
			displayMessage(macro.locale.addError.format([space.name, error]));
		};
		space.create(callback, errback);
		return false;
	}
};

})(jQuery);
//}}}
