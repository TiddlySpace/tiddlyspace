/***
|''Requires''|TiddlyWebConfig|
***/
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
		if(config.options.txtUserName == "GUEST") {
			var host = config.defaultCustomFields["server.host"];
			host = encodeURIComponent(host);
			$("<a>login</a>"). // TODO: reuse form provided by register macro
				attr("href", "/challenge/cookie_form?tiddlyweb_redirect=" + host).
				appendTo(place);
			wikify("<<register>>", place);
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
