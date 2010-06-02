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
		<p class="annotation" />
		<input type="submit" />
	</fieldset>
</form>
!Code
***/
//{{{
(function($) {

var macro = config.macros.TiddlySpaceMembers = {
	formTemplate: store.getTiddlerText(tiddler.title + "##HTMLForm"),
	locale: {
		listError: "error retrieving members for space %0: %1",
		addLabel: "Add member",
		addSuccess: "added member %0",
		noUserError: "user <em>%0</em> does not exist",
		delTooltip: "click to remove member",
		delPrompt: "Are you sure you want to remove member %0?",
		delSuccess: "removed member %0",
		delError: "error removing member %0: %1"
	},

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var space = config.extensions.tiddlyspace.currentSpace.name;
		var host = config.extensions.tiddlyweb.host;
		this.space = new tiddlyweb.Space(space, host);
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
		this.space.members().get(callback, errback);
	},
	displayMembers: function(members, container) {
		var items = $.map(members, function(item, i) {
			var btn = $('<a href="javascript:;" />').text(item).
				attr("title", macro.locale.delTooltip).
				click(macro.onClick);
			return $("<li />").append(btn)[0];
		});
		$("<ul />").append(items).appendTo(container);
		this.generateForm().appendTo(container);
	},
	generateForm: function() {
		return $(this.formTemplate).submit(this.onSubmit).
			find("legend").text(this.locale.addLabel).end().
			find(".annotation").hide().end().
			find("[type=submit]").val(this.locale.addLabel).end();
	},
	onSubmit: function(ev) {
		var form = $(this).closest("form");
		var username = form.find("[name=username]").val();
		var callback = function(data, status, xhr) {
			displayMessage(macro.locale.addSuccess.format([username]));
			var container = form.closest("div");
			macro.refresh(container);
		};
		var errback = function(xhr, error, exc) { // TODO: DRY (cf. TiddlySpaceLogin)
			switch(xhr.status) {
				case 409:
					error = macro.locale.noUserError.format([username]);
					break;
				default:
					error = "%0: %1".format([xhr.statusText, xhr.responseText]).
						htmlEncode();
					break;
			}
			var el = $("[name=username]", form).addClass("error").focus(function(ev) {
				el.removeClass("error").unbind(ev.originalEvent.type).
					closest("form").find(".annotation").slideUp();
			});
			$(".annotation", form).html(error).slideDown();
		};
		macro.space.members().add(username, callback, errback);
		return false;
	},
	onClick: function(ev) { // XXX: ambiguous; rename
		var btn = $(this);
		var username = btn.text();
		var msg = macro.locale.delPrompt.format([username]);
		var callback = function(data, status, xhr) {
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
//}}}
