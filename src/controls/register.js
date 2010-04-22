/***
|''Requires''|TiddlyWebConfig|
***/
//{{{
(function($) {

var macro = config.macros.register = {
	label: "Register",
	msgUserSuccess: "created user %0",
	msgUserError: "error creating user %0: %1",
	msgSpaceSuccess: "created space %0",
	msgSpaceError: "error creating space %0: %1",

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var container = $("<fieldset />");
		$("<legend />").text(this.label).appendTo(container);
		$(container).
			append('<input type="text" value="username" />').
			append('<input type="password" value="password" />');
		$('<input type="submit" />').val(this.label).
			click(this.onClick).
			appendTo(container);
		$('<form action="" />').append(container).appendTo(place);
	},
	onClick: function(ev) {
		var btn = $(this);
		var username = btn.siblings("input[type=text]").val();
		var password = btn.siblings("input[type=password]").val();
		var host = config.defaultCustomFields["server.host"];

		var callback = function(resource, status, xhr) {
			displayMessage(macro.msgUserSuccess.format([username]));
			var space = new tiddlyweb.Space(username, [username], host);
			space.put(_callback, _errback);
		};
		var errback = function(xhr, error, exc) {
			displayMessage(macro.msgUserError.format([username, xhr.statusText]));
		};
		var _callback = function(resource, status, xhr) {
			displayMessage(macro.msgSpaceSuccess.format([username]));
		};
		var _errback = function(xhr, error, exc) {
			displayMessage(macro.msgSpaceError.format([username, xhr.statusText]));
		};

		var user = new tiddlyweb.User(username, password, host);
		user.create(callback, errback);
		return false;
	}
};

})(jQuery);
//}}}
