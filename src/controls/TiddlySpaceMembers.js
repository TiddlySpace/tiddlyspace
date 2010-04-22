/***
|''Requires''|TiddlyWebConfig|
***/
//{{{
(function($) {

var macro = config.macros.TiddlySpaceMembers = {
	label: "Add member",
	msgSuccess: "added member %0",
	msgError: "error adding member %0: %1",

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var container = $("<fieldset />");
		$("<legend />").text(this.label).appendTo(container);
		$(container).
			append('<input type="text" value="username" />');
		$('<input type="submit" />').val(this.label).
			click(this.onClick).
			appendTo(container);
		$('<form action="" />').append(container).appendTo(place);
	},
	onClick: function(ev) {
		var btn = $(this);
		var spaceName = config.defaultCustomFields["server.workspace"]. // XXX: DRY; cf. TiddlySpaceSidebar
			split("recipes/")[1]. // XXX: brittle?
			split("_")[0]; // XXX: brittle (space name must not contain underscores)
		var username = btn.siblings("input[type=text]").val();
		var host = config.defaultCustomFields["server.host"];

		var getCallback = function(space, status, xhr) {
			space.members.pushUnique(username);
			space = new tiddlyweb.Space(space.name, space.members, space.host); // XXX: required because policies are only calculated on instantiation
			space.put(putCallback, errback);
		};
		var putCallback = function(resource, status, xhr) {
			displayMessage(macro.msgSuccess.format([username]));
		};
		var errback = function(xhr, error, exc) {
			displayMessage(macro.msgError.format([username, xhr.statusText]));
		};

		var space = new tiddlyweb.Space(spaceName, [null], host);
		space.get(getCallback, errback);
		return false;
	}
};

})(jQuery);
