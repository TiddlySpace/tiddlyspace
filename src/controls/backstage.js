//{{{
(function($) {

config.tasks.tiddlyspace = {
	text: "TiddlySpace",
	tooltip: "TiddlySpace control panel",
	content: "<<TiddlySpaceUser>>"
};
config.backstageTasks.push("tiddlyspace");

config.macros.TiddlySpaceUser = {
	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var host = store.getTiddler("TiddlyWebConfig").fields["server.host"]; // XXX: suboptimal?
		host = encodeURIComponent(host);
		if(config.options.txtUserName == "GUEST") {
			$("<a>login</a>").
				attr("href", "/challenge/openid?tiddlyweb_redirect=" + host).
				appendTo(place);
			wikify("!Register\n<<register>>", place);
		} else {
			$("<dl />").
				append("<dt>current user</dt>").
				append("<dd>" + config.options.txtUserName + "</dd>").
				appendTo(place);
		}
	}
};

})(jQuery);
//}}}
