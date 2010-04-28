//{{{
(function($) {

config.backstageTasks = [];

config.tasks.autoSave = {
	text: "autosave",
	tooltip: "toggle automatic saving",
	action: function() {}
};
config.backstageTasks.push("autoSave");

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

// initialize state
var _show = backstage.show;
backstage.show = function() {
	// selectively hide backstage tasks based on user status
	var tasks = $("#backstageToolbar .backstageTask").show();
	config.extensions.TiddlyWeb.getUserInfo(function(user) {
		if(user.anon) {
			tasks.slice(1, 3).hide();
		} else {
			tasks.eq(0).hide();
		}
	});
	// add AutoSave option
	var place = $('<span task="autoSave"></span>').
		replaceAll("#backstageToolbar [task=autoSave]")[0];
	invokeMacro(place, "option", "chkAutoSave");
	$("<span>autosave</span>").appendTo(place);
	// display backstage
	return _show.apply(this, arguments);
};

})(jQuery);
//}}}
