/***
|''Name''|TiddlySpaceUserControls|
|''Version''|0.5.6|
|''Description''|registration and login UIs|
|''Status''|@@beta@@|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/raw/master/src/plugins/TiddlySpaceUserControls.js|
|''Requires''|TiddlySpaceConfig|
!Usage
{{{<<TiddlySpaceLogin>>}}}
Shows a login box. If the user is logged in shows a login message. You can define this message by making use of the message parameter: {{{<<TiddlySpaceLogin message:"hello %0">>}}}

{{{<<TiddlySpaceLogout>>}}}
Shows a logout button.

{{{<<TiddlySpaceRegister>>}}}
Shows a registration form.
!HTMLForm
<form action="#">
	<fieldset>
		<legend />
		<dl>
			<dt class="_basic">Username:</dt>
			<dd class="_basic"><input type="text" name="username" autocapitalize="off" autocorrect="off" /></dd>
			<dt class="_basic">Password:</dt>
			<dd class="_basic">
				<input type="password" name="password" />
			</dd>
			<dt class="_basic _register" >Confirm Password:</dt>
			<dd class="_basic _register" >
				<input type="password" name="password_confirm" />
			</dd>
			<dt class="_openid">OpenID:</dt>
			<dd class="_openid"><input type="text" name="openid" autocapitalize="off" autocorrect="off" /></dd>
			<dt class="_login">Method:</dt>
			<dd class="_login">
				<select>
					<option value="basic">username &amp; password</option>
					<option value="openid">OpenID</option>
				</select>
			</dd>
		</dl>
		<input type="hidden" name="tiddlyweb_redirect" class="_openid" />
		<p class="annotation" />
		<input type="submit" />
	</fieldset>
</form>
!Code
***/
//{{{
(function($) {

var tweb = config.extensions.tiddlyweb;
var tiddlyspace = config.extensions.tiddlyspace;

var tsl = config.macros.TiddlySpaceLogin = {
	formTemplate: store.getTiddlerText(tiddler.title + "##HTMLForm"),
	locale: {
		label: "Login",
		success: "You are currently logged in as %0.",
		loginError: "error logging in %0: %1",
		forbiddenError: "login failed for <em>%0</em>: username and password do not match"
	},

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var type = params[0];
		this.name = macroName;
		var container = $("<div />", { className: this.name }).appendTo(place);
		var args = paramString.parseParams("name", null, true, false, true)[0];
		var options = {};
		options.message = args.message ? args.message[0] : false;
		this.refresh(container, type, options);
	},
	refresh: function(container, type, options) {
		var msg = this.locale;
		type = type || "basic";
		var selector = type == "openid" ? "._basic" : "._openid";
		var handler = function(ev) {
			var form = $(this).closest("form");
			return tsl[type + "Login"](form);
		};
		container.empty();
		tweb.getUserInfo(function(user) {
			if(user.anon) {
				$(tsl.formTemplate).submit(handler).
					find("legend").text(msg.label).end().
					find("select").change(tsl.onSelect).end().
					find("option[value=" + type + "]").
						attr("selected", "selected").end().
					find("._register, " + selector).remove().end().
					find(".annotation").hide().end().
					find("[type=submit]").val(msg.label).end().
					appendTo(container);
			} else {
				tsl.printLoggedInMessage(container, user.name, options);
			}
		});
	},
	printLoggedInMessage: function(container, user, options) {
		options = options ? options : {};
		tweb.getStatus(function(status) {
			var uri = tiddlyspace.getHost(status.server_host, user);
			var link = '<a href="%0">%1</a>'.format([uri, user]);
			var msg = options.message ? options.message : tsl.locale.success;
			$(container).html(msg.format([link]));
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
		this.login(username, password, tsl.redirect, function(xhr, error, exc) { // TODO: DRY (cf. displayMembers)
			var ctx = {
				msg: {
					401: tsl.locale.forbiddenError.format([username])
				},
				form: form,
				selector: "[name=username], [name=password]"
			};
			tsl.displayError(xhr, error, exc, ctx);
		});
		return false;
	},
	displayError: function(xhr, error, exc, ctx) {
		error = ctx.msg[xhr.status] || // XXX: lacks parameters
			"%0: %1".format([xhr.statusText, xhr.responseText]).htmlEncode();
		var el = $(ctx.selector, ctx.form).addClass("error").focus(function(ev) {
			el.removeClass("error").unbind(ev.originalEvent.type).
				closest("form").find(".annotation").slideUp();
		});
		$(".annotation", ctx.form).html(error).slideDown();
	},
	login: function(username, password, callback, errback) {
		var challenger = "cookie_form";
		var uri = "%0/challenge/%1".format([tweb.host, challenger]);
		ajaxReq({
			url: uri,
			type: "POST",
			data: {
				user: username,
				password: password,
				csrf_token: tiddlyspace.getCSRFToken(),
				tiddlyweb_redirect: tweb.serverPrefix + "/status" // workaround to marginalize automatic subsequent GET
			},
			success: callback,
			error: function(xhr, error, exc) {
				if(errback) {
					errback.apply(this, arguments);
				} else {
					displayMessage(tsl.locale.loginError.format([username, error]));
				}
			}
		});
	},
	openidLogin: function(form) {
		var openid = form.find("[name=openid]").val();
		var challenger = "tiddlywebplugins.tiddlyspace.openid";
		var uri = "%0/challenge/%1".format([tweb.host, challenger]);
		var redirect = tweb.serverPrefix || "/"; // must not be empty string
		form.attr("action", uri).attr("method", "POST").
			find("[name=tiddlyweb_redirect]").val(redirect);
		return true;
	},
	redirect: function() {
		window.location = window.location.protocol == "file:" ? window.location : tweb.host;
	}
};

var logoutMacro = config.macros.TiddlySpaceLogout = {
	locale: {
		label: "Log out"
	},

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var container = $("<div />").appendTo(place)[0];
		tweb.getUserInfo(function(user) {
			if(!user.anon) {
				var form = $('<form method="POST" />').addClass(macroName).
					attr("action", tweb.host + "/logout");
				var token = tiddlyspace.getCSRFToken();
				$('<input type="hidden" name="csrf_token" />').val(token).
					appendTo(form);
				$("<button />", { text: logoutMacro.locale.label }).
					click(function(ev) { form.submit(); }).
					appendTo(form);
				form.appendTo(container);
			}
		});
	}
};

var tsr = config.macros.TiddlySpaceRegister = {
	locale: {
		label: "Sign Up",
		userSuccess: "created user %0",
		userError: "user <em>%0</em> already exists",
		spaceSuccess: "created space %0",
		spaceError: "space <em>%0</em> already exists",
		charError: "error: invalid username - must only contain lowercase " +
			"letters, digits or hyphens",
		passwordError: "error: passwords do not match"
	},
	formTemplate: store.getTiddlerText(tiddler.title + "##HTMLForm"),

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		$(this.formTemplate).submit(this.onSubmit).
			find("._login, ._openid").remove().end().
			find("legend").text(this.locale.label).end().
			find(".annotation").hide().end().
			find("[type=submit]").val(this.locale.label).end().
			appendTo(place);
	},
	onSubmit: function(ev) {
		var form = $(this).closest("form");
		var username = form.find("[name=username]").val();
		var password = form.find("[name=password]").val();
		var passwordConfirm = form.find("[name=password_confirm]").val();
		var validName = tiddlyspace.isValidSpaceName(username);
		if(validName && password && password == passwordConfirm) { // TODO: check password length?
			tsr.register(username, password, form);
		} else {
			var xhr = { status: 409 }; // XXX: hacky
			var msg = validName ? "passwordError" : "charError";
			var ctx = {
				msg: { 409: tsr.locale[msg] },
				form: form,
				selector: validName ? "[type=password]" : "[name=username]"
			};
			tsl.displayError(xhr, null, null, ctx);
		}
		return false;
	},
	register: function(username, password, form) {
		var msg = tsr.locale;
		var ctx = {
			form: form,
			selector: "[name=username]"
		};
		var userCallback = function(resource, status, xhr) {
			displayMessage(msg.userSuccess.format([username])); // XXX: redundant?
			tsl.login(username, password, function(data, status, xhr) {
				var space = new tiddlyweb.Space(username, tweb.host);
				space.create(spaceCallback, spaceErrback);
			});
		};
		var userErrback = function(xhr, error, exc) {
			ctx.msg = { 409: msg.userError.format([username]) };
			tsl.displayError(xhr, error, exc, ctx);
		};
		var spaceCallback = function(resource, status, xhr) {
			displayMessage(msg.spaceSuccess.format([username]));
			tsl.redirect();
		};
		var spaceErrback = function(xhr, error, exc) {
			ctx.msg = { 409: msg.spaceError.format([username]) }; // XXX: 409 unlikely to occur at this point
			tsl.displayError(xhr, error, exc, ctx);
		};
		var user = new tiddlyweb.User(username, password, tweb.host);
		user.create(userCallback, userErrback);
	}
};

})(jQuery);
//}}}
