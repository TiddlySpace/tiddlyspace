/***
|''Requires''|TiddlyWebConfig|
!HTMLForm
<form action="#">
	<fieldset>
		<legend />
		<dl>
			<dt>Username:</dt>
			<dd><input type="text" name="username" /></dd>
			<dt>Password:</dt>
			<dd>
				<input type="password" name="password" />
				<input type="password" name="password_confirm" />
			</dd>
			<dt>Method:</dt>
			<dd>
				<select>
					<option value="password">username &amp; password</option>
					<option value="openid">OpenID</option>
				</select>
			</dd>
		</dl>
		<input type="submit" />
	</fieldset>
</form>
!Code
***/
//{{{
(function($) {

var cfg = config.extensions.tiddlyweb;

var tsl = config.macros.TiddlySpaceLogin = {
	formTemplate: store.getTiddlerText(tiddler.title + "##HTMLForm"),
	locale: {
		label: "Login",
		logoutLabel: "Log out",
		success: "logged in as %0",
		error: "error logging in %0: %1"
	},

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var msg = tsl.locale;
		cfg.getUserInfo(function(user) {
			if(user.anon) {
				$(tsl.formTemplate).submit(tsl.onSubmit).
					find("legend").text(msg.label).end().
					find("select").change(tsl.onSelect).end().
					find("[name=password_confirm]").remove().end().
					find("[type=submit]").val(msg.label).end().
					appendTo(place);
			} else {
				$("<a />", { href: cfg.host + "/logout", text: msg.logoutLabel }).
					appendTo(place);
			}
		});
	},
	onSelect: function(ev) {
		var el = $(this);
		if(el.val() == "openid") {
			var host = config.extensions.tiddlyweb.host;
			var challenger = "tiddlywebplugins.tiddlyspace.openid";
			var uri = "%0/challenge/%1".format([cfg.host, challenger]);
			el.closest("form").unbind("submit", tsl.submit). // XXX: hacky, due to excessive reuse!?
				attr("action", uri).attr("method", "POST").
				find("[name=username]").closest("dd").
					prev().text("OpenID").end(). // TODO: i18n?
					end().end().
				find("[name=username]").attr("name", "openid").end().
				find("[name=password]").closest("dd").
					prev().remove().end().
					remove().end().end();
			// TODO: redirect to personal space
		} // TODO: restore password functionality as required
	},
	onSubmit: function(ev) {
		var form = $(this).closest("form");
		var username = form.find("[name=username]").val();
		var password = form.find("[name=password]").val();
		tsl.login(username, password, function() {
			tsl.redirect(username);
		});
		return false;
	},
	login: function(username, password, callback) {
		var challenger = "cookie_form"; // XXX: hardcoded
		var uri = "%0/challenge/%1".format([cfg.host, challenger]);
		$.ajax({
			url: uri,
			type: "POST",
			data: {
				user: username,
				password: password,
				tiddlyweb_redirect: cfg.host + "/status" // XXX: ugly workaround to marginalize automatic subsequent GET
			},
			success: callback,
			error: function(xhr, error, exc) {
				displayMessage(tsl.locale.error.format([username, error]));
			}
		});
	},
	redirect: function(spaceName) {
		var spaceUri = cfg.host.replace("://", "://" + spaceName + "."); // XXX: brittle (e.g. if already in a space)
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
		cfg.getUserInfo(function(user) {
			if(user.anon) {
				$(tsr.formTemplate).submit(tsr.onSubmit).
					find("select").closest("dd"). // XXX: hacky, due to excessive reuse!?
						prev().remove().end().
						remove().end().end().
					find("legend").text(tsr.locale.label).end().
					find("[type=submit]").val(tsr.locale.label).end().
					appendTo(place);
			}
		});
	},
	onSubmit: function(ev) {
		var form = $(this).closest("form");
		var username = form.find("[name=username]").val();
		var password = form.find("[name=password]").val();
		var passwordConfirm = form.find("[name=password_confirm]").val();
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
				var space = new tiddlyweb.Space(username, cfg.host);
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
		var user = new tiddlyweb.User(username, password, cfg.host);
		user.create(userCallback, userErrback);
	}
};

})(jQuery);
//}}}
