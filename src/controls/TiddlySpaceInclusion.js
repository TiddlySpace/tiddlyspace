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

var macro = config.macros.TiddlySpaceInclusion = {
	formTemplate: store.getTiddlerText(tiddler.title + "##HTMLForm"),
	locale: {
		addPassiveLabel: "Include space",
		addActiveLabel: "Include into space",
		passiveDesc: "Include a space into the current space",
		activeDesc: "Include another space in the current space",
		addSuccess: "included %0 in %1",
		delPrompt: "Are you sure you want to exclude %0 from the current space?",
		delTooltip: "click to exclude from the space",
		delError: "error excluding %0: %1",
		listError: "error retrieving spaces included in space %0: %1",
		forbiddenError: "unauthorized to modify space <em>%0</em>",
		noSpaceError: "space <em>%0</em> does not exist",
		conflictError: "space <em>%0</em> is already included in <em>%1</em>",
		noInclusions: "no spaces are included"
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
			this.listInclusions(container);
		}
	},
	listInclusions: function(container) {
		var recipe = new tiddlyweb.Recipe(currentSpace + "_public", host);
		recipe.get(function(recipe, status, xhr) {
			var inclusions = $.map(recipe.recipe, function(item, i) { // TODO: refactor to canonicalize; move to TiddlySpaceConfig!?
				var arr = item[0].split("_public");
				return (arr[0] != currentSpace && arr[1] === "") ? arr[0] : null;
			});
			var items = $.map(inclusions, function(item, i) { // TODO: DRY (cf. displayMembers)
				var btn = $('<a href="javascript:;" />').text(item).
					attr("title", macro.locale.delTooltip).
					click(macro.onClick);
				return $("<li />").append(btn)[0];
			});
			if(items.length) {
				$("<ul />").append(items).appendTo(container);
			} else {
				$('<div class="annotation" />')
					text(macro.locale.noInclusions).appendTo(container);
			}
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
		var callback = function(data, status, xhr) {
			displayMessage(macro.locale.addSuccess.format([provider, subscriber]));
			// TODO: refresh list or reload page
		};
		var errback = function(xhr, error, exc) {
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
		};
		this.include(provider, subscriber, callback, errback);
		return false;
	},
	onClick: function(ev) { // XXX: ambiguous; rename
		var btn = $(this);
		var provider = btn.text();
		var msg = macro.locale.delPrompt.format([provider]);
		var callback = function(data, status, xhr) {
			btn.closest("li").slideUp(function(ev) { $(this).remove(); });
		};
		var errback = function(xhr, error, exc) { // XXX: doesn't actually happen
			displayMessage(macro.locale.delError.format([username, error]));
		};
		if(confirm(msg)) {
			macro.include(provider, currentSpace, callback, errback, true);
		}
	},
	include: function(provider, subscriber, callback, errback, unsubscribe) {
		var data = {};
		var key = unsubscribe ? "unsubscriptions" : "subscriptions";
		data[key] = [provider];
		$.ajax({ // TODO: add to model/space.js?
			url: host + "/spaces/" + subscriber,
			type: "POST",
			contentType: "application/json",
			data: $.toJSON(data),
			success: callback,
			error: errback
		});
	}
};

})(jQuery);
//}}}
