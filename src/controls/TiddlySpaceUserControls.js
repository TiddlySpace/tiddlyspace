/***
|''Requires''|TiddlyWebConfig|
!HTMLForm
<form id="userForm" action="#">
	<fieldset>
		<legend />
		<dl>
			<dt>Username:</dt>
			<input type="text" name="username" />
			<dt>Password:</dt>
			<input type="password" name="password" />
			<input type="password" name="password_confirm" />
		</dl>
		<input type="submit" />
	</fieldset>
</form>
!Code
***/
//{{{
(function($) {

var host = config.defaultCustomFields["server.host"].replace(/\/$/, ""); // TODO: should be cached globally!?

var tsl = config.macros.TiddlySpaceLogin = {
	formTemplate: store.getTiddlerText(tiddler.title + "##HTMLForm"),
	locale: {
		label: "Login",
		success: "logged in as %0",
		error: "error logging in %0: %1"
	},

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		$(this.formTemplate).
			find("legend").text(this.locale.label).end().
			find("input[name=password_confirm]").remove().end().
			find("input[type=submit]").val(this.locale.label).click(this.onSubmit).end().
			appendTo(place);
	},
	onSubmit: function(ev) {
		var form = $(this).closest("form");
		var username = form.find("input[name=username]").val();
		var password = form.find("input[name=password]").val();
		tsl.login(username, password, function() {
			tsl.redirect(username);
		});
		return false;
	},
	login: function(username, password, callback) {
		var challenger = "cookie_form"; // XXX: hardcoded
		var uri = host + "/challenge/" + challenger;
		$.ajax({
			url: uri,
			type: "POST",
			data: {
				user: username,
				password: password,
				tiddlyweb_redirect: host + "/status" // XXX: ugly workaround to marginalize automatic subsequent GET
			},
			success: callback,
			error: function(xhr, error, exc) {
				displayMessage(tsl.locale.error.format([username, error]));
			}
		});
	},
	redirect: function(spaceName) {
		var spaceUri = host.replace("://", "://" + spaceName + "."); // XXX: hacky?
		window.location = spaceUri;
	}
};

var tsr = config.macros.TiddlySpaceRegister = {
	locale: {
		label: "Register",
		userSuccess: "created user %0",
		userError: "error creating user %0: %1",
		spaceSuccess: "created space %0",
		spaceError: "error creating space %0: %1",
		passwordError: "error: passwords do not match"
	},
	formTemplate: store.getTiddlerText(tiddler.title + "##HTMLForm"),

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		$(this.formTemplate).
			find("legend").text(this.locale.label).end().
			find("input[type=submit]").val(this.locale.label).click(this.onSubmit).end().
			appendTo(place);
	},
	onSubmit: function(ev) {
		var form = $(this).closest("form");
		var username = form.find("input[name=username]").val();
		var password = form.find("input[name=password]").val();
		var passwordConfirm = form.find("input[name=password_confirm]").val();
		if(password && password == passwordConfirm) { // TODO: check password length
			tsr.register(username, password);
		} else {
			alert(tsr.locale.passwordError); // XXX: alert is evil
		}
		return false;
	},
	register: function(username, password) {
		var msg = tsr.locale;
		var userCallback = function(resource, status, xhr) {
			displayMessage(msg.userSuccess.format([username])); // XXX: redundant?
			tsl.login(username, password, function(data, status, xhr) {
				var space = new tiddlyweb.Space(username, host);
				space.create(spaceCallback, spaceErrback);
			});
		};
		var userErrback = function(xhr, error, exc) {
			displayMessage(msg.userError.format([username, xhr.statusText]));
		};
		var spaceCallback = function(resource, status, xhr) {
			displayMessage(msg.spaceSuccess.format([username]));
			tsl.redirect(username);
		};
		var spaceErrback = function(xhr, error, exc) {
			displayMessage(msg.spaceError.format([username, xhr.statusText]));
		};
		var user = new tiddlyweb.User(username, password, host);
		user.create(userCallback, userErrback);
	}
};

})(jQuery);
//}}}
