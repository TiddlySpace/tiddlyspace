/***
|''Name''|TiddlySpaceAdmin|
|''Version''|0.5.8|
|''Status''|@@beta@@|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/raw/master/src/plugins/|
|''Requires''|TiddlySpaceConfig TiddlySpaceFormsPlugin|
!Code
***/
//{{{
(function($) {

var tweb = config.extensions.tiddlyweb;
var tiddlyspace = config.extensions.tiddlyspace;
var formMaker = config.extensions.formMaker;

var tsl = config.macros.TiddlySpaceLogin = {
	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var locale = tsl.locale;
		var challenger = params[0];
		this.name = macroName;
		var container = $("<div />", { className: this.name }).appendTo(place)[0];
		var args = paramString.parseParams("name", null, true, false, true)[0];
		var options = {};
		options.message = args.message ? args.message[0] : false;
		this.refresh(container, challenger, options);
	},
	refresh: function(container, challenger, options) {
		$(container).empty();
		tweb.getUserInfo(function(user) {
			if(user.anon) {
				var template, handler;
				if(challenger == "openid"){
					challenger = "tiddlywebplugins.tiddlyspace.openid";
					handler = "%0/challenge/%1".format(tweb.host, challenger);
					template = tsl.openidFormTemplate;
				} else {
					template = tsl.basicFormTemplate;
					handler = function(ev, form) {
						return tsl.basicLogin(form, challenger);
					};
				}
				formMaker.make(container, template, handler, { locale: admin.locale.login });
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
			var msg = options.message ? options.message : admin.locale.success;
			$(container).html(msg.format([link]));
		});
	},
	basicLogin: function(form, challenger) {
		challenger = challenger ? challenger : "cookie_form";
		var username = $(form).find("[name=username]").val();
		var password = $(form).find("[name=password]").val();
		this.login(username, password, tsl.redirect, function(xhr, error, exc) { // TODO: DRY (cf. displayMembers)
			var msg = { 401: admin.locale.forbiddenError.format(username) };
			formMaker.displayMessage(form, msg[xhr.status], true, { annotate: "[name=username],[name=password]" });
		}, challenger);
		return false;
	},
	login: function(username, password, callback, errback, challenger) {
		challenger = challenger ? challenger : "cookie_form";
		var uri = "%0/challenge/%1".format([tweb.host, challenger]);
		ajaxReq({ url: uri, type: "POST", success: callback,
			data: {
				user: username,
				password: password,
				csrf_token: tiddlyspace.getCSRFToken(),
				tiddlyweb_redirect: tweb.serverPrefix + "/status" // workaround to marginalize automatic subsequent GET
			},
			error: function(xhr, error, exc) {
				if(errback) {
					errback.apply(this, arguments);
				} else {
					displayMessage(admin.locale.loginError.format(username, error));
				}
			}
		});
	},
	redirect: function() {
		window.location = window.location.protocol === "file:" ? window.location : tweb.host;
	}
};

var logoutMacro = config.macros.TiddlySpaceLogout = {
	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var container = $("<div />").appendTo(place)[0];
		tweb.getUserInfo(function(user) {
			if(!user.anon) {
				config.extensions.formMaker.make(container, [], tweb.host + "/logout", { 
					className: macroName, locale: admin.locale.logout });
			}
		});
	}
};

var tsr = config.macros.TiddlySpaceRegister = {
	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		config.extensions.formMaker.make(place, tsr.formTemplate, tsr.onSubmit, { 
			className: macroName, locale: admin.locale.register });
	},
	onSubmit: function(ev, form) {
		var username = $("[name=username]", form).val();
		var password = $("[name=password]", form).val();
		var passwordConfirm = $("[name=password_confirm]", form).val();
		var validName = tiddlyspace.isValidSpaceName(username);
		if(validName && password && password === passwordConfirm) { // TODO: check password length?
			tsr.register(username, password, form);
		} else {
			var msg = validName ? admin.locale.passwordError : admin.locale.charError;
			var options = { annotate: validName ? "[type=password]" : "[name=username]" };
			formMaker.displayMessage(form, msg, true, options);
		}
		return false;
	},
	register: function(username, password, form) {
		var locale = admin.locale;
		var options = {
			annotate: "[name=username]"
		};
		var userCallback = function(resource, status, xhr) {
			tsl.login(username, password, function(data, status, xhr) {
				var space = new tiddlyweb.Space(username, tweb.host);
				space.create(spaceCallback, spaceErrback);
			});
		};
		var userErrback = function(xhr, error, exc) {
			var msg = xhr.status === 409 ? locale.userError.format(username) : false;
			formMaker.displayMessage(form, msg, true, options);
		};
		var spaceCallback = function() {
			formMaker.displayMessage(form, locale.spaceSuccess.format(username), true);
			tsl.redirect();
		};
		var spaceErrback = function(xhr, error, exc) {
			var msg = xhr.status === 409 ? locale.spaceError.format(username) : false; // XXX: 409 unlikely to occur at this point
			formMaker.displayMessage(form, msg, true, options);
		};
		var user = new tiddlyweb.User(username, password, tweb.host);
		user.create(userCallback, userErrback);
	}
};

var admin = config.macros.TiddlySpaceAdmin = {
	locale: {
		username: "username",
		success: "You are currently logged in as %0.",
		loginError: "error logging in %0: %1",
		forbiddenError: "login failed for <em>%0</em>: username and password do not match",
		password: "password",
		confirmPassword: "confirm password:",
		openid: "openid username:",
		logout: { submit: "Log out" },
		login: { submit: "Login" },
		register: { submit: "Sign Up" },
		identities: { submit: "Add Identity" },
		userSuccess: "created user %0",
		userError: "user <em>%0</em> already exists",
		spaceSuccess: "created space %0",
		spaceError: "space <em>%0</em> already exists",
		charError: "error: invalid username - must only contain lowercase letters, digits or hyphens",
		passwordError: "error: passwords do not match",
		listError: "Error retrieving list of identities for user %0"
	},
	elements: {
		openid: function() {
			return { name: "openid" };
		},
		password: function(repeated) {
			var name = typeof(repeated) === "string" ? repeated : false;
			if(!name) {
				name = repeated ? "password_confirm" : "password";
			}
			return { type: "password", name: name };
		},
		username: function() {
			return { name: "username" };
		},
		redirect: function() {
			return { type: "hidden", name: "tiddlyweb_redirect", value: tweb.serverPrefix || "/" };
		}
	},
	init: function() {
		var elements = this.elements;
		var locale = this.locale;
		tsl.basicFormTemplate =  [ locale.username,elements.username(), locale.password, elements.password() ];
		tsl.registerFormTemplate = tsl.basicFormTemplate.concat([ locale.confirmPassword, elements.password(true) ]);
		tsl.openidFormTemplate = [ locale.openid, elements.openid(), elements.redirect() ];
		tsr.formTemplate = [locale.username, elements.username(),
			locale.password, elements.password(), locale.confirmPassword, elements.password(true)];
		identities.template = [ locale.openid, elements.openid() ];
	}
};

var identities = config.macros.TiddlySpaceIdentities = {

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var mode = params[0] || "list";
		var container = $("<div />").appendTo(place)[0];
		if(mode === "add") {
			identities.generateForm(container);
		} else if(mode === "list") {
			tweb.getUserInfo(function(user) {
				if(!user.anon) {
					$(container).addClass("listIdentities");
					identities.refresh(container);
				}
			});
		}
	},
	refresh: function(container) {
		$(container).empty().append("<ul />");
		$.ajax({ // TODO: add (dynamically) to chrjs user extension?
			url: "%0/users/%1/identities".format(tweb.host, tweb.username),
			type: "GET",
			success: function(data, status, xhr) {
				var identities = $.map(data, function(item, i) {
					return $("<li />").text(item)[0];
				});
				$("ul", container).append(identities);
			},
			error: function(xhr, error, exc) {
				displayMessage(admin.locale.listError.format(tweb.username));
			}
		});
	},
	generateForm: function(container) {
		var uri = "%0/challenge/tiddlywebplugins.tiddlyspace.openid".format(tweb.host);
		var ready = false;
		config.extensions.formMaker.make(container, identities.template, uri, {
			beforeSubmit: function(ev, form) {
				var openid = $("[name=openid]").val();
				$('<input name="tiddlyweb_redirect" />').attr("type", "hidden").
					val("%0#auth:OpenID=%1".format(tweb.serverPrefix, openid)).appendTo(form);
			}, locale: admin.locale.identities });
	}
};

config.paramifiers.auth = {
	locale: {
		success: "successfully added identity %0",
		error: "error adding identity %0: %1"
	},

	onstart: function(v) {
		var identity = window.location.hash.split("auth:OpenID=")[1];
		if(identity) {
			this.addIdentity(identity);
		}
	},
	addIdentity: function(name) {
		var msg = config.paramifiers.auth.locale;
		var tiddler = new tiddlyweb.Tiddler(name);
		tiddler.bag = new tiddlyweb.Bag("MAPUSER", tweb.host);
		var callback = function(data, status, xhr) {
			displayMessage(msg.success.format(name));
			window.location = window.location.toString().split("#")[0] + "#";
		};
		var errback = function(xhr, error, exc) {
			displayMessage(msg.error.format(name, error));
		};
		tiddler.put(callback, errback);
	}
};


}(jQuery));
//}}}
