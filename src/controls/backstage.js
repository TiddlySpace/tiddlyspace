//{{{
config.tasks.tiddlyspace = {
	text: "TiddlySpace",
	tooltip: "TiddlySpace control panel",
	content: "<<TiddlySpaceCP>>"
};
config.backstageTasks.push("tiddlyspace");

config.macros.TiddlySpaceCP = {
	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		if(config.options.txtUserName == "GUEST") {
			console.log(place,
			jQuery("<a>login</a>").
				attr("href", "/challenge/openid?tiddlyweb_redirect=%2F").
				appendTo(place));
		} else {
			jQuery("<dl />").
				append("<dt>current user</dt>").
				append("<dd>" + config.options.txtUserName + "</dd>").
				appendTo(place);
		}
	}
};
//}}}
