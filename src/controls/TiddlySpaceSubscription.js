/***
|''Requires''|TiddlySpaceConfig|
!HTMLForm
<form action="#">
	<fieldset>
		<legend />
		<dl>
			<dt>Space Name:</dt>
			<dd><input type="text" name="space" /></dd>
		</dl>
		<input type="submit" />
	</fieldset>
</form>
!Code
***/
//{{{
(function($) {

var macro = config.macros.TiddlySpaceSubscription = {
	formTemplate: store.getTiddlerText(tiddler.title + "##HTMLForm"),
	locale: {
		addLabel: "Add subscription",
		addSuccess: "added subscription for %0 to %1",
		addError: "error subscribing %0 to %1: %2"
	},

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		$(this.formTemplate).submit(this.onSubmit).
			find("legend").text(this.locale.addLabel).end().
			find("[type=submit]").val(this.locale.addLabel).end().
			appendTo(place);
	},
	onSubmit: function(ev) {
		var form = $(this).closest("form");
		var space = form.find("[name=space]").val();
		var ns = config.extensions;
		var uri = ns.tiddlyweb.host + "/spaces/" + ns.tiddlyspace.currentSpace;
		var data = { subscriptions: [space] };
		$.ajax({ // TODO: add to model/space.js?
			url: uri,
			type: "POST",
			contentType: "application/json",
			data: $.toJSON(data),
			success: function(data, status, xhr) {
				displayMessage(macro.locale.addSuccess.format([space,
					ns.tiddlyspace.currentSpace]));
			},
			error: function(xhr, error, exc) {
				displayMessage(macro.locale.addError.format([space,
					ns.tiddlyspace.currentSpace, error]));
			}
		});
		return false;
	}
};

})(jQuery);
//}}}
