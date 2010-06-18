//{{{
/***
|''Requires''|TiddlySpaceConfig chrjs|
!HTMLForm
<form method="POST" action="#">
	<fieldset>
		<legend />
		<dl>
			<dt>Type:</dt>
			<dd>
				<select>
					<option value="openid">OpenID</option>
				</select>
			</dd>
			<dt>Identity:</dt>
			<dd><input type="text" name="openid" /></dd>
		</dl>
		<input type="hidden" name="tiddlyweb_redirect" />
		<input type="submit" />
	</fieldset>
</form>
!TODO
* process config.extensions.tiddlyweb.challengers instead of hardcoding OpenID
!Code
***/
//{{{
(function($) {

var ns = config.extensions.tiddlyweb;

var macro = config.macros.TiddlySpaceIdentities = {
	formTemplate: store.getTiddlerText(tiddler.title + "##HTMLForm"),
	locale: {
		listError: "error retrieving identities for user %0",
		addLabel: "Add Identity"
	},

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		ns.getUserInfo(function(user) {
			if(!user.anon) {
				var container = $("<div />").appendTo(place);
				macro.refresh(container);
			}
		});
	},
	refresh: function(container) {
		container.empty().append("<ul />").append(this.generateForm());
		$.ajax({ // TODO: add (dynamically) to chrjs user extension?
			url: "%0/users/%1/identities".format([ns.host, ns.username]),
			type: "GET",
			success: function(data, status, xhr) {
				var identities = $.map(data, function(item, i) {
					return $("<li />").text(item)[0];
				});
				$("ul", container).append(identities);
			},
			error: function(xhr, error, exc) {
				displayMessage(macro.locale.listError.format([ns.username]));
			}
		});
	},
	generateForm: function() {
		var challenger = "tiddlywebplugins.tiddlyspace.openid";
		var uri = "%0/challenge/%1".format([ns.host, challenger]);
		var redirect = ns.serverPrefix + "#auth:OpenID";
		return $(this.formTemplate).attr("action", uri).
			find("legend").text(this.locale.addLabel).end().
			find("[name=tiddlyweb_redirect]").val(redirect).end().
			find("[type=submit]").val(this.locale.addLabel).end();
	}
};

config.paramifiers.auth = {
	locale: {
		success: "successfully added identity %0",
		error: "error adding identity %0: %1"
	},

	readCookie: function(name) {
		var nameEQ = name + "=";
		var ca = document.cookie.split(";");
		for(var i=0;i < ca.length;i++) {
			var c = ca[i];
			while (c.charAt(0)==" ") c = c.substring(1,c.length);
			if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
		}
		return null;
	},

	onstart: function(v) {
		var identity = this.readCookie("tiddlyweb_secondary_user");
		if(identity) {
			// strip off the MAC from the cookie and unquote
			identity = identity.replace(/:[^:]+$/, '').replace('"', '');
			this.addIdentity(identity);
		}
	},
	addIdentity: function(name) {
		var msg = config.paramifiers.auth.locale;
		var tiddler = new tiddlyweb.Tiddler(name);
		tiddler.bag = new tiddlyweb.Bag("MAPUSER", ns.host);
		var callback = function(data, status, xhr) {
			displayMessage(msg.success.format([name]));
			window.location = window.location.toString().split("#")[0] + "#";
		};
		var errback = function(xhr, error, exc) {
			displayMessage(msg.error.format([name, error]));
		};
		tiddler.put(callback, errback);
	}
};

})(jQuery);
//}}}
