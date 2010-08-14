/***
|''Name''|TiddlySpaceMembers|
|''Version''||
|''Description''|Provides interfaces for managing members of a given space in TiddlySpace|
|''Status''|//unknown//|
|''Source''|http://github.com/TiddlySpace/tiddlyspace|
|''Requires''|TiddlySpaceConfig TiddlySpaceUserControls|
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
		authError: "list of members is only visible to members of space <em>%0</em>",
		listError: "error retrieving members for space <em>%0</em>: %1",
		addLabel: "Add member",
		noUserError: "user <em>%0</em> does not exist",
		delTooltip: "click to remove member",
		delPrompt: "Are you sure you want to remove member %0?",
		delError: "error removing member %0: %1"
	},

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var space = config.extensions.tiddlyspace.currentSpace.name;
		var host = config.extensions.tiddlyweb.host;
		this.space = new tiddlyweb.Space(space, host); // XXX: singleton
		var container = $("<div />").appendTo(place);
		if(!readOnly) {
			this.refresh(container);
		} else {
			var msg = this.locale.authError.format([this.space.name]);
			this.notify(msg, container);
		}
	},
	refresh: function(container) {
		var callback = function(data, status, xhr) {
			container.empty();
			macro.displayMembers(data, container);
		};
		var errback = function(xhr, error, exc) {
			var msg;
			if(xhr.status == 403) {
				msg = macro.locale.authError.format([macro.space.name]);
			} else {
				msg = macro.locale.listError.format([macro.space.name, error]);
			}
			macro.notify(msg, container);
		};
		this.space.members().get(callback, errback);
	},
	displayMembers: function(members, container) {
		var items = $.map(members, function(member, i) {
			var link = $('<a href="javascript:;" />').text(member); // TODO: link to space
			var btn = $('<a class="deleteButton" href="javascript:;" />').
				text("x"). // TODO: i18n (use icon!?)
				attr("title", macro.locale.delTooltip).
				data("username", member).click(macro.onClick);
			return $("<li />").append(link).append(btn)[0];
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
		var selector = "[name=username]";
		var username = form.find(selector).val();
		var callback = function(data, status, xhr) {
			var container = form.closest("div");
			macro.refresh(container);
		};
		var errback = function(xhr, error, exc) {
			var ctx = {
				msg: { 409: macro.locale.noUserError.format([username]) },
				form: form,
				selector: selector
			};
			config.macros.TiddlySpaceLogin.displayError(xhr, error, exc, ctx);
		};
		macro.space.members().add(username, callback, errback);
		return false;
	},
	onClick: function(ev) { // XXX: ambiguous; rename
		var btn = $(this);
		var username = btn.data("username");
		var msg = macro.locale.delPrompt.format([username]);
		var callback = function(data, status, xhr) {
			if(username == config.options.txtUserName) {
				readOnly = true;
				refreshDisplay();
			}
			var container = btn.closest("div");
			macro.refresh(container);
		};
		var errback = function(xhr, error, exc) {
			displayMessage(macro.locale.delError.format([username, error]));
		};
		if(confirm(msg)) {
			macro.space.members().remove(username, callback, errback);
		}
	},
	notify: function(msg, container) {
		container.addClass("annotation").html(msg);
	}
};

})(jQuery);
//}}}
