//{{{
/***
|''Requires''|TiddlyWebConfig chrjs|
!HTMLForm
<form action="#">
	<fieldset>
		<legend />
		<dl>
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

var macro = config.macros.TiddlySpaceIdentities = {
	formTemplate: store.getTiddlerText(tiddler.title + "##HTMLForm"),
	locale: {
		label: "Add Identiy",
		success: "successfully added identity %0",
		error: "error adding identity %0: %1"
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
		var tiddler = new tiddlyweb.Tiddler(identity);
		tiddler.bag = new tiddlyweb.Bag("MAPUSER", config.extensions.TiddlyWeb.host);
		var callback = function(data, status, xhr) {
			displayMessage(macro.locale.success.format([identity]));
		};
		var errback = function(xhr, error, exc) {
			displayMessage(macro.locale.error.format([identity, error]));
		};
		tiddler.put(callback, errback);
		return false;
	}
};

})(jQuery);
//}}}
