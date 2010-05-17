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

var ns = config.extensions;

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
		macro.subscribe(space, ns.tiddlyspace.currentSpace);
		return false;
	},
	subscribe: function(provider, subscriber) {
		var uri = ns.tiddlyweb.host + "/spaces/" + subscriber;
		var data = { subscriptions: [provider] };
		$.ajax({ // TODO: add to model/space.js?
			url: uri,
			type: "POST",
			contentType: "application/json",
			data: $.toJSON(data),
			success: function(data, status, xhr) {
				displayMessage(macro.locale.addSuccess.format([provider,
					subscriber]));
			},
			error: function(xhr, error, exc) {
				displayMessage(macro.locale.addError.format([provider,
					subscriber, error]));
			}
		});
	}
};

})(jQuery);
//}}}
