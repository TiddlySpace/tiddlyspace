//{{{
/***
|''Requires''|TiddlyWebConfig chrjs|
!HTMLForm
<form action="#">
	<fieldset>
		<legend />
		<dl>
			<dt>Type:</dt>
			<dd>
				<select>
					<option>OpenID</option>
				</select>
			</dd>
			<dt>Username:</dt>
			<dd><input type="text" name="identity" /></dd>
		</dl>
		<input type="submit" />
	</fieldset>
</form>
!Code
***/
//{{{
(function($) {

var host = config.extensions.TiddlyWeb.host;

var macro = config.macros.TiddlySpaceIdentities = {
	formTemplate: store.getTiddlerText(tiddler.title + "##HTMLForm"),
	locale: {
		label: "Add Identity",
		success: "successfully added identity %0",
		error: "error adding identity %0: %1",
		authError: "error authenticating identity %0: %1"
	},

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		config.extensions.TiddlyWeb.getUserInfo(function(user) {
			if(!user.anon) {
				$(macro.formTemplate).
					find("legend").text(macro.locale.label).end().
					find("input[type=submit]").val(macro.locale.label).
						click(macro.onSubmit).end().
					appendTo(place);
			}
		});
	},
	onSubmit: function(ev) {
		var form = $(this).closest("form");
		var identity = form.find("input[name=identity]").val();
		macro.authenticate(identity, function(data, status, xhr) {
			window.location = xhr.getResponseHeader("Location");
		});
		return false;
	},
	authenticate: function(identity, callback) {
		var challenger = "tiddlywebplugins.tiddlyspace.openid"; // XXX: hardcoded
		var uri = host + "/challenge/" + challenger;
		$.ajax({
			url: uri,
			type: "POST",
			data: { // XXX: hardcoded
				openid: identity,
				tiddlyweb_redirect: host + "%0/#auth:OpenID"
			},
			success: callback,
			error: function(xhr, error, exc) {
				displayMessage(macro.locale.authError.format([identity, error]));
			}
		});
	},
	addIdentity: function(name) {
		var tiddler = new tiddlyweb.Tiddler(name);
		tiddler.bag = new tiddlyweb.Bag("MAPUSER", host);
		var callback = function(data, status, xhr) {
			displayMessage(macro.locale.success.format([identity]));
		};
		var errback = function(xhr, error, exc) {
			displayMessage(macro.locale.error.format([identity, error]));
		};
		tiddler.put(callback, errback);
	}
};

})(jQuery);
//}}}
