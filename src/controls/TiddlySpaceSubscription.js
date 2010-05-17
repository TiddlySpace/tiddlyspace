/***
|''Requires''|TiddlySpaceConfig chrjs|
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

var host = config.extensions.tiddlyweb.host;
var currentSpace = config.extensions.tiddlyspace.currentSpace;

var macro = config.macros.TiddlySpaceSubscription = {
	formTemplate: store.getTiddlerText(tiddler.title + "##HTMLForm"),
	locale: {
		addPassiveLabel: "Add subscription",
		addActiveLabel: "Subscribe",
		passiveDesc: "Add subscription to current space",
		activeDesc: "Subscribe current space to existing space",
		addSuccess: "added subscription for %0 to %1",
		listError: "error retrieving subscriptions for space %0: %1",
		addError: "error subscribing %0 to %1: %2"
	},

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		// passive mode means subscribing given space to current space
		// active mode means subscribing current space to given space
		var mode = params[0] || "list";
		var form = $(this.formTemplate);
		if(mode == "passive") {
			form.submit(this.onPassiveSubmit).
				find("._active").remove().end().
				find("legend").text(this.locale.addPassiveLabel).end().
				find("p").text(this.locale.passiveDesc).end().
				find("[type=submit]").val(this.locale.addPassiveLabel).end().
				appendTo(place);
		} else if(mode == "active") {
			form.submit(this.onActiveSubmit).
				find("._passive").remove().end().
				find("legend").text(this.locale.addActiveLabel).end().
				find("p").text(this.locale.activeDesc).end().
				find("[type=submit]").val(this.locale.addActiveLabel).end().
				appendTo(place);
			this.populateSpaces(form);
		} else {
			var container = $("<div />").appendTo(place);
			this.listSubscriptions(container);
		}
	},
	listSubscriptions: function(container) {
		var recipe = new tiddlyweb.Recipe(currentSpace + "_public", host);
		recipe.get(function(recipe, status, xhr) {
			var subscriptions = $.map(recipe.recipe, function(item, i) { // TODO: refactor to canonicalize; move to TiddlySpaceConfig!?
				var arr = item[0].split("_public");
				return (arr[0] != currentSpace && arr[1] === "") ? arr[0] : null;
			});
			var items = $.map(subscriptions, function(item, i) { // TODO: DRY (cf. displayMembers)
				var btn = $('<a href="javascript:;" />').text(item);
					//attr("title", macro.locale.delTooltip). // TODO
					//click(this.onClick); // TODO
				return $("<li />").append(btn)[0];
			});
			$("<ul />").append(items).appendTo(container);
		}, function(xhr, error, exc) {
			displayMessage(macro.locale.listError.format([currentSpace, error]));
		});
	},
	populateSpaces: function(form) { // TODO: rename?
		$.ajax({ // TODO: add to model/space.js?
			url: host + "/spaces?mine=1",
			type: "GET",
			success: function(data, status, xhr) {
				var spaces = $.map(data, function(item, i) {
					return $("<option />", { value: item }).text(item)[0];
				});
				$("select", form).append(spaces);
			} // TODO: error handling?
		});
	},
	onPassiveSubmit: function(ev) {
		var space = $(this).closest("form").find("[name=space]").val();
		macro.subscribe(space, currentSpace);
		return false;
	},
	onActiveSubmit: function(ev) {
		var space = $(this).closest("form").find("select").val();
		macro.subscribe(currentSpace, space);
		return false;
	},
	subscribe: function(provider, subscriber) {
		var data = { subscriptions: [provider] };
		$.ajax({ // TODO: add to model/space.js?
			url: host + "/spaces/" + subscriber,
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
