//{{{
(function($) {

config.backstageTasks = [];

config.tasks.login = {
	text: "login",
	tooltip: "TiddlySpace login",
	content: "<<tiddler BackstageLogin>>"
};
config.backstageTasks.push("login");

config.tasks.user = {
	text: "user",
	tooltip: "user control panel",
	content: "<<tiddler BackstageUser>>"
};
config.backstageTasks.push("user");

config.tasks.space = {
	text: "space",
	tooltip: "space control panel",
	content: "<<tiddler BackstageSpace>>"
};
config.backstageTasks.push("space");

config.tasks.tiddlers = {
	text: "tiddlers",
	tooltip: "tiddlers control panel",
	content: "<<tiddler BackstageTiddlers>>"
};
config.backstageTasks.push("tiddlers");

config.tasks.options = {
	text: "options",
	tooltip: "TiddlyWiki options",
	content: "<<tiddler BackstageOptions>>"
};
config.backstageTasks.push("options");

var _show = backstage.show;
backstage.show = function() { // XXX: not very safe, due to unknown time of evaluation
	var tasks = $("#backstageToolbar .backstageTask").show();
	if(config.options.txtUserName == "GUEST") {
		tasks.slice(1, 3).hide();
	} else {
		tasks.eq(0).hide();
	}
	return _show.apply(this, arguments);
};

})(jQuery);
//}}}
