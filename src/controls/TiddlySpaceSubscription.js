/***
|''Requires''|TiddlySpaceConfig|
!HTMLForm
<form action="#">
	<fieldset>
		<legend />
		<p />
		<dl>
			<dt class="_passive">Space Name:</dt>
			<dd class="_passive"><input type="text" name="space" /></dd>
			<dt class="_active">Space Selection:</dt>
			<dd class="_active">
				<select>
					<option></option>
				</select>
			</dd>
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
		addPassiveLabel: "Add subscription",
		addActiveLabel: "Subscribe",
		passiveDesc: "Add subscription to current space",
		activeDesc: "Subscribe current space to existing space",
		addSuccess: "added subscription for %0 to %1",
		addError: "error subscribing %0 to %1: %2"
	},

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		// passive mode means subscribing given space to current space
		// active mode means subscribing current space to given space
		var mode = params[0] || "passive";
		var form = $(this.formTemplate);
		if(mode == "passive") {
			form.submit(this.onPassiveSubmit).
				find("._active").remove().end().
				find("legend").text(this.locale.addPassiveLabel).end().
				find("p").text(this.locale.passiveDesc).end().
				find("[type=submit]").val(this.locale.addPassiveLabel).end().
				appendTo(place);
		} else {
			form.submit(this.onActiveSubmit).
				find("._passive").remove().end().
				find("legend").text(this.locale.addActiveLabel).end().
				find("p").text(this.locale.activeDesc).end().
				find("[type=submit]").val(this.locale.addActiveLabel).end().
				appendTo(place);
			this.populateSpaces(form);
		}
	},
	populateSpaces: function(form) { // TODO: rename?
		$.ajax({ // TODO: add to model/space.js?
			url: ns.tiddlyweb.host + "/spaces?mine=1",
			type: "GET",
			success: function(data, status, xhr) {
				var spaces = $.map(data, function(item, i) {
					return $("<option />", { value: item }).text(item)[0]
				});
				$("select", form).append(spaces);
			} // TODO: error handling?
		});
	},
	onPassiveSubmit: function(ev) {
		var space = $(this).closest("form").find("[name=space]").val();
		macro.subscribe(space, ns.tiddlyspace.currentSpace);
		return false;
	},
	onActiveSubmit: function(ev) {
		var space = $(this).closest("form").find("select").val();
		macro.subscribe(ns.tiddlyspace.currentSpace, space);
		return false;
	},
	subscribe: function(provider, subscriber) {
		var data = { subscriptions: [provider] };
		$.ajax({ // TODO: add to model/space.js?
			url: ns.tiddlyweb.host + "/spaces/" + subscriber,
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
