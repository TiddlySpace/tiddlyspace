/***
|''Name''|TiddlySpaceChangePassword|
|''Version''|0.2.0|
|''Author''|Osmosoft|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/raw/master/src/plugins/TiddlySpaceChangePassword.js|
|''Requires''|TiddlyWebConfig TiddlySpaceUserControls|
!HTMLForm
<form action="#">
	<fieldset>
		<legend />
		<dl>
			<dt>Current password:</dt>
			<dd>
				<input type="password" name="password" />
			</dd>
			<dd>
				<dt>New password:</dt>
				<input type="password" name="new_password" />
				<dt>Confirm new password:</dt>
				<input type="password" name="new_password_confirm" />
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

var tweb = config.extensions.tiddlyweb;
var formMaker = config.extensions.formMaker;

var macro = config.macros.TiddlySpaceChangePassword = {
	locale: {
		label: "Change password",
		cpwSuccess: "Password changed",
		noPasswordError: "Please enter password",
		passwordMinLength: 6,
		errors: {
			"409a": "Passwords do not match",
			"409b": "Error: password must be at least %0 characters",
			400: "The old password you provided is incorrect"
		}
	},
	formTemplate: store.getTiddlerText(tiddler.title + "##HTMLForm"),

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		$(macro.formTemplate).submit(macro.onSubmit).
			find("legend").text(macro.locale.label).end().
			find(".annotation").hide().end().
			find("[type=submit]").val(macro.locale.label).end().
			appendTo(place);
	},

	onSubmit: function(ev) {
		var msg = macro.locale;
		var form = $(this).closest("form");
		form.find(".annotation").hide();
		var password = form.find("[name=password]").val();
		var npassword = form.find("[name=new_password]").val();
		var npasswordConfirm = form.find("[name=new_password_confirm]").val();
		var options;
		if(npassword != npasswordConfirm) {
			options = {
				selector: "[name=new_password], [name=new_password_confirm]"
			};
			formMaker.displayError(form, "409a", macro.locale.errors, options);
		} else if(npassword.length < msg.passwordMinLength) {
			options = {
				format: [ msg.passwordMinLength ],
				selector: "[name=new_password]",
			};
			formMaker.displayError(form, "409b", macro.locale.errors, options);
		} else {
			macro.changePassword(tweb.username, password, npassword);
		}
		return false;
	},

	changePassword: function(username, password, npassword, form) {
		var pwCallback = function(resource, status, xhr) {
			displayMessage(macro.locale.cpwSuccess);
		};
		var pwErrback = function(xhr, error, exc) {
			var options = {
				selector: "[name=password]"
			};
			formMaker.displayError(form, xhr.status, macro.locale.errors, options);
		};
		var user = new tiddlyweb.User(username, password, tweb.host);
		user.setPassword(npassword, pwCallback, pwErrback);
	}
};

})(jQuery);
//}}}
