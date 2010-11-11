/***
|''Name''|TiddlySpaceIdentities|
|''Version''|0.1.2|
|''Description''||
|''Status''|@@beta@@|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/raw/master/src/plugins/TiddlySpaceIdentities.js|
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
		<input type="hidden" name="csrf_token" />
		<input type="submit" />
	</fieldset>
</form>
!TODO
* process config.extensions.tiddlyweb.challengers instead of hardcoding OpenID
!Code
***/
//{{{
(function($) {

var tweb = config.extensions.tiddlyweb;

var macro = config.macros.TiddlySpaceIdentities = {
	formTemplate: store.getTiddlerText(tiddler.title + "##HTMLForm"),
	locale: {
		listError: "error retrieving identities for user %0",
		addLabel: "Add Identity"
	},

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var mode = params[0] || "list";
		if(mode == "add") {
			$(place).append(macro.generateForm());
		} else if(mode == "list") {
			tweb.getUserInfo(function(user) {
				if(!user.anon) {
					var container = $("<div />").addClass("listIdentities").appendTo(place);
					macro.refresh(container);
				}
			});
		}
	},
	refresh: function(container) {
		container.empty().append("<ul />");
		$.ajax({ // TODO: add (dynamically) to chrjs user extension?
			url: "%0/users/%1/identities".format([tweb.host, tweb.username]),
			type: "GET",
			success: function(data, status, xhr) {
				var identities = $.map(data, function(item, i) {
					return $("<li />").text(item)[0];
				});
				$("ul", container).append(identities);
			},
			error: function(xhr, error, exc) {
				displayMessage(macro.locale.listError.format([tweb.username]));
			}
		});
	},
	generateForm: function() {
		var challenger = "tiddlywebplugins.tiddlyspace.openid";
		var uri = "%0/challenge/%1".format([tweb.host, challenger]);
		var redirect = tweb.serverPrefix + "#auth:OpenID=";
		return $(this.formTemplate).attr("action", uri).submit(this.onSubmit).
			find("legend").text(this.locale.addLabel).end().
			find("[name=tiddlyweb_redirect]").val(redirect).end().
			find("[type=submit]").val(this.locale.addLabel).end();
	},
	onSubmit: function(ev) {
		var form = $(this);
		var redirect = form.find("[name=tiddlyweb_redirect]");
		var openid = form.find("[name=openid]").val();
		redirect.val(redirect.val() + openid);
		var token = config.extensions.tiddlyspace.get_csrf_token();
		var csrf_token = form.find("[name=csrf_token]");
		csrf_token.val(token);
		return true;
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
