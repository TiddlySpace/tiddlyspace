/***
|''Name''|TiddlySpaceChangePassword|
|''Version''|0.3.1|
|''Author''|Osmosoft|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/raw/master/src/plugins/TiddlySpaceChangePassword.js|
|''Requires''|TiddlyWebConfig TiddlySpaceAdmin|
!Code
***/
//{{{
(function($) {

var tweb = config.extensions.tiddlyweb;
var formMaker = config.extensions.formMaker;
var admin = config.macros.TiddlySpaceAdmin;

var macro = config.macros.TiddlySpaceChangePassword = {
	locale: {
		submit: "Change password",
		cpwSuccess: "Password changed",
		noPasswordError: "Please enter password",
		passwordMinLength: 6,
		errors: {
			"409a": "Passwords do not match",
			"409b": "Error: password must be at least %0 characters",
			400: "The old password you provided is incorrect"
		}
	},
	elements: [ "Current password:", admin.elements.password(),
		"New password:", admin.elements.password("new_password"),
		"Confirm new password:", admin.elements.password("new_password_confirm") ],

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		formMaker.make(place, macro.elements, macro.onSubmit, { locale: macro.locale });
	},

	onSubmit: function(ev, form) {
		var msg = macro.locale;
		$(form).find(".annotation").hide();
		var password = $(form).find("[name=password]").val();
		var npassword = $(form).find("[name=new_password]").val();
		var npasswordConfirm = $(form).find("[name=new_password_confirm]").val();
		var options;
		if(npassword !== npasswordConfirm) {
			options = {
				selector: "[name=new_password], [name=new_password_confirm]"
			};
			formMaker.displayError(form, "409a", macro.locale.errors, options);
		} else if(npassword.length < msg.passwordMinLength) {
			options = {
				format: [ msg.passwordMinLength ],
				selector: "[name=new_password]"
			};
			formMaker.displayError(form, "409b", macro.locale.errors, options);
		} else {
			macro.changePassword(tweb.username, password, npassword, form);
		}
		return false;
	},

	changePassword: function(username, password, npassword, form) {
		var pwCallback = function(resource, status, xhr) {
			$(form).empty().text(macro.locale.cpwSuccess);
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

}(jQuery));
//}}}
