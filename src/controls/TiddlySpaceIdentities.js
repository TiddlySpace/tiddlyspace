//{{{
/***
|''Requires''|TiddlyWebConfig chrjs|
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
* process config.extensions.TiddlyWeb.challengers instead of hardcoding OpenID
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
	},

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		config.extensions.TiddlyWeb.getUserInfo(function(user) {
			if(!user.anon) {
				var challenger = "tiddlywebplugins.tiddlyspace.openid";
				var redirect = host + "/#auth:OpenID";
				var uri = "%0/challenge/%1".format([host, challenger]);
				$(macro.formTemplate).attr("action", uri).
					find("legend").text(macro.locale.label).end().
					find("input[name=tiddlyweb_redirect]").val(redirect).end().
					find("input[type=submit]").val(macro.locale.label).end().
					appendTo(place);
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
