/***
|''Name''|TiddlySpaceChangePassword|
|''Requires''|TiddlyWebConfig|
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

var ns = config.extensions.tiddlyweb;

var macro = config.macros.TiddlySpaceChangePassword = {
	locale: {
		label: "Change password",
		cpwSuccess: "Password changed",
		cpwError: "Error changing password: %0",
		noPasswordError: "Please enter password",
		passwordMatchError: "Error: passwords do not match",
		passwordShortError: "Error: password must be at least %0 characters",
		passwordMinLength: 6
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
		if(npassword != npasswordConfirm) {
			var ctx = {
				form: form,
				selector: "[name=new_password]"
			};
			config.macros.TiddlySpaceChangePassword.displayError(null, null, null, ctx, msg.passwordMatchError);
		} else if(npassword.length < msg.passwordMinLength) {
			var ctx = {
				form: form,
				selector: "[name=new_password]"
			};
			config.macros.TiddlySpaceChangePassword.displayError(null, null, null, ctx,
				msg.passwordShortError.format([msg.passwordMinLength]));
		} else {
			macro.changePassword(ns.username, password, npassword);
		}
		return false;
	},

	displayError: function(xhr, error, exc, ctx, errMsg) {
		error = errMsg ||
			"%0: %1".format([xhr.statusText, xhr.responseText]).htmlEncode();
		var el = $(ctx.selector, ctx.form).addClass("error").focus(function(ev) {
			el.removeClass("error").unbind(ev.originalEvent.type).
				closest("form").find(".annotation").slideUp();
		});
		$(".annotation", ctx.form).html(error).slideDown();
	},

	changePassword: function(username, password, npassword, form) {
		var msg = macro.locale;
		var pwCallback = function(resource, status, xhr) {
			displayMessage(msg.cpwSuccess);
		};
		var pwErrback = function(xhr, error, exc) {
			var ctx = {
				form: form,
				selector: "[name=new_password]"
			};
			errMsg = msg.cpwError.format([xhr.statusText]);
			config.macros.TiddlySpaceChangePassword.displayError(xhr, null, null, ctx, errMsg);
		};
		var user = new tiddlyweb.User(username, password, ns.host);
		user.setPassword(npassword, pwCallback, pwErrback);
	}
};

})(jQuery);
//}}}
