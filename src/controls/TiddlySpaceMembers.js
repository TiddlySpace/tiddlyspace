/***
|''Requires''|TiddlySpaceConfig|
!HTMLForm
<form action="#">
	<fieldset>
		<legend />
		<dl>
			<dt>Username:</dt>
			<dd><input type="text" name="username" /></dd>
		</dl>
		<input type="submit" />
	</fieldset>
</form>
!Code
***/
//{{{
(function($) {

var cfg = config.extensions.TiddlyWeb;

var macro = config.macros.TiddlySpaceMembers = {
	formTemplate: store.getTiddlerText(tiddler.title + "##HTMLForm"),
	locale: {
		listError: "error retrieving members for space %0: %1",
		addLabel: "Add member",
		addSuccess: "added member %0",
		addError: "error adding member %0: %1",
		delTooltip: "click to remove member",
		delPrompt: "Are you sure you want to remove member %0?",
		delSuccess: "removed member %0",
		delError: "error removing member %0: %1"
	},

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		macro.space = new tiddlyweb.Space(cfg.tiddlyspace.currentSpace, cfg.host);
		var container = $("<div />").appendTo(place);
		this.refresh(container);
	},
	refresh: function(container) {
		var callback = function(data, status, xhr) {
			container.empty();
			macro.displayMembers(data, container);
		};
		var errback = function(xhr, error, exc) {
			displayMessage(macro.locale.listError.format([macro.space.name, error]));
		};
		macro.space.members().get(callback, errback);
	},
	displayMembers: function(members, container) {
		var items = $.map(members, function(item, i) {
			var btn = $('<a href="javascript:;" />').text(item).
				attr("title", macro.locale.delTooltip).
				click(macro.onClick);
			return $("<li />").append(btn)[0];
		});
		$("<ul />").append(items).appendTo(container);
		macro.generateForm().appendTo(container);
	},
	generateForm: function() {
		return $(macro.formTemplate).
			find("legend").text(macro.locale.addLabel).end().
			find("input[type=submit]").val(macro.locale.addLabel).
				click(macro.onSubmit).end();
	},
	onSubmit: function(ev) { // XXX: ambiguous; rename
		var form = $(this).closest("form");
		var username = form.find("input[name=username]").val();
		var callback = function(resource, status, xhr) {
			displayMessage(macro.locale.addSuccess.format([username]));
			var container = form.closest("div");
			macro.refresh(container);
		};
		var errback = function(xhr, error, exc) {
			displayMessage(macro.locale.addError.format([username, error]));
		};
		macro.space.members().add(username, callback, errback);
		return false;
	},
	onClick: function(ev) { // XXX: ambiguous; rename
		var btn = $(this);
		var username = btn.text();
		var msg = macro.locale.delPrompt.format([username]);
		var callback = function(resource, status, xhr) {
			displayMessage(macro.locale.delSuccess.format([username]));
			var container = btn.closest("div");
			macro.refresh(container);
		};
		var errback = function(xhr, error, exc) {
			displayMessage(macro.locale.delError.format([username, error]));
		};
		if(confirm(msg)) {
			macro.space.members().remove(username, callback, errback);
		}
	}
};

})(jQuery);
