/***
|''Requires''|TiddlySpaceConfig TiddlySpaceUserControls chrjs|
!HTMLForm
<form action="#">
	<fieldset>
		<legend />
		<p class="description" />
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
		<p class="annotation" />
		<input type="submit" />
	</fieldset>
</form>
!Code
***/
//{{{
(function($) {

var host = config.extensions.tiddlyweb.host;
var currentSpace = config.extensions.tiddlyspace.currentSpace.name;

var macro = config.macros.TiddlySpaceSubscription = {
	formTemplate: store.getTiddlerText(tiddler.title + "##HTMLForm"),
	locale: {
		addPassiveLabel: "Add subscription",
		addActiveLabel: "Subscribe",
		passiveDesc: "Add subscription to current space",
		activeDesc: "Subscribe current space to existing space",
		addSuccess: "added subscription for %0 to %1",
		listError: "error retrieving subscriptions for space %0: %1",
		forbiddenError: "unauthorized to modify space <em>%0</em>",
		noSpaceError: "space <em>%0</em> does not exist",
		conflictError: "space <em>%0</em> is already subscribed to <em>%1</em>"
	},

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		// passive mode means subscribing given space to current space
		// active mode means subscribing current space to given space
		var mode = params[0] || "list";
		var form = $(this.formTemplate).
			find(".annotation").hide().end();
		if(mode == "passive") {
			form.submit(function(ev) { return macro.onSubmit(this, mode); }).
				find("._active").remove().end().
				find("legend").text(this.locale.addPassiveLabel).end().
				find(".description").text(this.locale.passiveDesc).end().
				find("[type=submit]").val(this.locale.addPassiveLabel).end().
				appendTo(place);
		} else if(mode == "active") {
			form.submit(function(ev) { return macro.onSubmit(this, mode); }).
				find("._passive").remove().end().
				find("legend").text(this.locale.addActiveLabel).end().
				find(".description").text(this.locale.activeDesc).end().
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
					return $("<option />", { value: item.name }).text(item.name)[0];
				});
				$("select", form).append(spaces);
			} // TODO: error handling?
		});
	},
	onSubmit: function(el, mode) {
		var form = $(el).closest("form");
		var selector = mode == "passive" ? "[name=space]" : "select";
		var space = form.find(selector).val();
		var provider = mode == "passive" ? space : currentSpace;
		var subscriber = mode == "passive" ? currentSpace : space;
		this.subscribe(provider, subscriber, function(xhr, error, exc) {
			var ctx = {
				msg: {
					403: macro.locale.forbiddenError.format([subscriber]),
					404: macro.locale.noSpaceError.format([subscriber]), // XXX: only relevant for passive mode? -- XXX: could also be provider!?
					409: macro.locale.conflictError.format([subscriber, provider]) // TODO: distinguish between cases non-existing and already subscribed
				},
				form: form,
				selector: selector
			};
			config.macros.TiddlySpaceLogin.displayError(xhr, error, exc, ctx);
		});
		return false;
	},
	subscribe: function(provider, subscriber, errback) {
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
			error: errback
		});
	}
};

})(jQuery);
//}}}
