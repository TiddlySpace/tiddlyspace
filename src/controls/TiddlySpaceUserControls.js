/***
|''Requires''|TiddlySpaceConfig|
!HTMLForm
<form action="#">
	<fieldset>
		<legend />
		<dl>
			<dt class="_basic">Username:</dt>
			<dd class="_basic"><input type="text" name="username" /></dd>
			<dt class="_basic">Password:</dt>
			<dd class="_basic">
				<input type="password" name="password" />
				<input type="password" name="password_confirm" class="_register" />
			</dd>
			<dt class="_openid">OpenID:</dt>
			<dd class="_openid"><input type="text" name="openid" /></dd>
			<dt class="_login">Method:</dt>
			<dd class="_login">
				<select>
					<option value="basic">username &amp; password</option>
					<option value="openid">OpenID</option>
				</select>
			</dd>
		</dl>
		<input type="hidden" name="tiddlyweb_redirect" class="_openid" />
		<input type="submit" />
	</fieldset>
</form>
!Code
***/
//{{{
(function($) {

var ns = config.extensions.tiddlyweb;

var tsl = config.macros.TiddlySpaceLogin = {
	formTemplate: store.getTiddlerText(tiddler.title + "##HTMLForm"),
	locale: {
		label: "Login",
		logoutLabel: "Log out",
		success: "logged in as %0",
		error: "error logging in %0: %1"
	},

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var type = params[0];
		this.name = macroName;
		var container = $("<div />", { className: this.name }).appendTo(place);
		this.refresh(container, type);
	},
	refresh: function(container, type) {
		var msg = this.locale;
		type = type || "basic";
		var selector = type == "openid" ? "._basic" : "._openid";
		var handler = function(ev) {
			var form = $(this).closest("form");
			return tsl[type + "Login"](form);
		};
		container.empty();
		ns.getUserInfo(function(user) {
			if(user.anon) {
				$(tsl.formTemplate).submit(handler).
					find("legend").text(msg.label).end().
					find("select").change(tsl.onSelect).end().
					find("option[value=" + type + "]").
						attr("selected", "selected").end().
					find("._register, " + selector).remove().end().
					find("[type=submit]").val(msg.label).end().
					appendTo(container);
			} else {
				$("<a />", {
					href: ns.host + "/logout",
					text: msg.logoutLabel
				}).appendTo(container);
			}
		});
	},
	onSelect: function(ev) {
		var el = $(this);
		var type = el.val();
		var container = el.closest("." + tsl.name);
		tsl.refresh(container, type);
	},
	basicLogin: function(form) {
		var username = form.find("[name=username]").val();
		var password = form.find("[name=password]").val();
		this.login(username, password, tsl.redirect);
		return false;
	},
	login: function(username, password, callback) {
		var challenger = "cookie_form";
		var uri = "%0/challenge/%1".format([ns.host, challenger]);
		$.ajax({
			url: uri,
			type: "POST",
			data: {
				user: username,
				password: password,
				tiddlyweb_redirect: ns.serverPrefix + "/status" // workaround to marginalize automatic subsequent GET
			},
			success: callback,
			error: function(xhr, error, exc) {
				displayMessage(tsl.locale.error.format([username, error]));
			}
		});
	},
	openidLogin: function(form) {
		var openid = form.find("[name=openid]").val();
		var host = config.extensions.tiddlyweb.host;
		var challenger = "tiddlywebplugins.tiddlyspace.openid";
		var uri = "%0/challenge/%1".format([ns.host, challenger]);
		var redirect = ns.serverPrefix || "/"; // must not be empty string
		form.attr("action", uri).attr("method", "POST").
			find("[name=tiddlyweb_redirect]").val(redirect);
		return true;
	},
	redirect: function() {
		window.location = ns.host;
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
		ns.getUserInfo(function(user) {
			if(user.anon) {
				$(tsr.formTemplate).submit(tsr.onSubmit).
					find("._login, ._openid").remove().end().
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
				var space = new tiddlyweb.Space(username, ns.host);
				space.create(spaceCallback, spaceErrback);
			});
		};
		var userErrback = function(xhr, error, exc) {
			displayMessage(msg.userError.format([username, xhr.statusText]));
		};
		var spaceCallback = function(resource, status, xhr) {
			displayMessage(msg.spaceSuccess.format([username]));
			tsl.redirect();
		};
		var spaceErrback = function(xhr, error, exc) {
			displayMessage(msg.spaceError.format([username, xhr.statusText]));
		};
		var user = new tiddlyweb.User(username, password, ns.host);
		user.create(userCallback, userErrback);
	}
};

})(jQuery);
//}}}
