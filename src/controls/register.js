//{{{
(function($) {

config.macros.register = {
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
		$('<input type="submit" value="register" />').
			click(this.onClick).
			appendTo(container);
		$('<form action="" />').append(container).appendTo(place);
	},
	onClick: function(ev) {
		var btn = $(this);
		var username = btn.siblings("input[type=text]").val();
		var password = btn.siblings("input[type=password]").val();
		var host = store.getTiddler("TiddlyWebConfig").fields["server.host"]; // XXX: suboptimal?

		var self = config.macros.register;
		var callback = function(resource, status, xhr) {
			displayMessage(self.msgUserSuccess.format([username]));
			var space = new TiddlyWeb.Space(username, username, host);
			space.put(_callback, _errback);
		};
		var errback = function(xhr, error, exc) {
			displayMessage(self.msgUserError.format([username, xhr.statusText]));
		};
		var _callback = function(resource, status, xhr) {
			displayMessage(self.msgSpaceSuccess.format([username]));
		};
		var _errback = function(xhr, error, exc) {
			displayMessage(self.msgSpaceError.format([username, xhr.statusText]));
		};

		var user = new TiddlyWeb.User(username, password, host);
		user.create(callback, errback);
		return false; // XXX: unnecessary?
	}
};

})(jQuery);
//}}}
