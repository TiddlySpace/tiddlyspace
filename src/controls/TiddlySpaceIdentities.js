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
					<option>OpenID</option>
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
* i18n (form labels)
* process config.extensions.tiddlyweb.challengers instead of hardcoding OpenID
!Code
***/
//{{{
(function($) {

var ns = config.extensions.tiddlyweb;

var macro = config.macros.TiddlySpaceIdentities = {
	formTemplate: store.getTiddlerText(tiddler.title + "##HTMLForm"),
	locale: {
		label: "Add Identity"
	},

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		ns.getUserInfo(function(user) {
			if(!user.anon) {
				var challenger = "tiddlywebplugins.tiddlyspace.openid";
				var uri = "%0/challenge/%1".format([ns.host, challenger]);
				var redirect = ns.serverPrefix + "#auth:OpenID";
				$(macro.formTemplate).attr("action", uri).
					find("legend").text(macro.locale.label).end().
					find("[name=tiddlyweb_redirect]").val(redirect).end().
					find("[type=submit]").val(macro.locale.label).end().
					appendTo(place);
			}
		});
	}
};

config.paramifiers.auth = {
	locale: {
		success: "successfully added identity %0",
		error: "error adding identity %0: %1"
	},

	onstart: function(v) {
		var identity = document.cookie.split("tiddlyweb_secondary_user=")[1];
		if(identity) {
			var name = identity.split(':')[0]; // XXX: brittle; name must not contain colon
			name = name.replace('"', ''); // XXX: hacky!?
			this.addIdentity(name);
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
