//{{{
config.backstageTasks = [];

config.tasks.login = { // TODO: dynamically hide if logged in
	text: "login",
	tooltip: "TiddlySpace login",
	content: "<<tiddler BackstageLogin>>"
};
config.backstageTasks.push("login");

config.tasks.user = { // TODO: dynamically hide if not logged in
	text: "user",
	tooltip: "user control panel",
	content: "<<tiddler BackstageUser>>"
};
config.backstageTasks.push("user");

config.tasks.space = { // TODO: dynamically hide if not logged in
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
//}}}
