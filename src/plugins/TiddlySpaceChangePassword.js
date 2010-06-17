/***
|''Requires''|TiddlySpaceConfig|
!HTMLForm
<form action="#">
	<fieldset>
		<legend />
		<dl>
			<dt>Password:</dt>
			<dd><input type="password" name="password" /></dd>
			<dt>New Password:</dt>
			<dd>
				<input type="password" name="new_password" />
				<input type="password" name="new_password_confirm" />
			</dd>
		</dl>
		<input type="submit" />
	</fieldset>
</form>
!Code
***/
//{{{
(function($) {

var ns = config.extensions.tiddlyweb;

var macro = config.macros.TiddlySpaceChangePassword = {
	locale: {
		label: "Change password",
		cpwSuccess: "Password changed",
		cpwError: "Error changing password: %0",
		noPasswordError: "Please enter password",
		passwordError: "Error: passwords do not match"
	},
	formTemplate: store.getTiddlerText(tiddler.title + "##HTMLForm"),

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		$(macro.formTemplate).submit(macro.onSubmit).
			find("legend").text(macro.locale.label).end().
			find("[type=submit]").val(macro.locale.label).end().
			appendTo(place);
	},

	onSubmit: function(ev) {
		var form = $(this).closest("form");
		var password = form.find("[name=password]").val();
		var npassword = form.find("[name=new_password]").val();
		var npasswordConfirm = form.find("[name=new_password_confirm]").val();
		if(!password) {
			displayMessage(macro.locale.noPasswordError);
		} else if(npassword == npasswordConfirm) { // TODO: check password length
			macro.changePassword(ns.username, password, npassword);
		} else {
			alert(macro.locale.passwordError); // XXX: alert is evil
		}
		return false;
	},

	changePassword: function(username, password, npassword) {
		var msg = macro.locale;
		var pwCallback = function(resource, status, xhr) {
			displayMessage(msg.cpwSuccess); // XXX: redundant?
		};
		var pwErrback = function(xhr, error, exc) {
			displayMessage(msg.cpwError.format([xhr.statusText]));
		};
		var user = new tiddlyweb.User(username, password, ns.host);
		user.setPassword(npassword, pwCallback, pwErrback);
	}
};

})(jQuery);
//}}}
