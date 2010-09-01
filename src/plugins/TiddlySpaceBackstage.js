/***
|''Name''|TiddlySpaceBackstage|
|''Version''|0.5.4|
|''Description''|Provides a TiddlySpace version of the backstage|
|''Status''|@@beta@@|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/raw/master/src/plugins/TiddlySpaceBackstage.js|
|''Requires''|TiddlySpaceConfig ImageMacroPlugin|
!Code
***/
//{{{
(function($) {

var tweb = config.extensions.tiddlyweb;
var tiddlyspace = config.extensions.tiddlyspace;
var imageMacro = config.macros.image;

if(config.options.chkBackstage === undefined) {
	config.options.chkBackstage = true;
}

config.backstageTasks = [];

config.tasks.login = {
	text: "login",
	tooltip: "TiddlySpace login",
	content: "<<tiddler BackstageLogin>>"
};
config.backstageTasks.push("login");

config.tasks.user = {
	text: "user:&nbsp;",
	tooltip: "user control panel",
	content: "<<tiddler BackstageUser>>"
};
config.backstageTasks.push("user");

config.tasks.space = {
	text: "space:&nbsp;",
	tooltip: "space control panel",
	content: "<<tiddler BackstageSpace>>",
	className: "right"
};
config.backstageTasks.push("space");

config.messages.backstage.prompt = "";
// initialize state
var _show = backstage.show;
backstage.show = function() {
	// selectively hide backstage tasks based on user status
	var tasks = $("#backstageToolbar .backstageTask").show();
	tweb.getUserInfo(function(user) {
		if(user.anon) {
			tasks.slice(1, 2).hide();
		} else {
			tasks.eq(0).hide();
		}
	});
	// display backstage
	return _show.apply(this, arguments);
};

var _init = backstage.init;
backstage.init = function(){
	_init.apply(this, arguments);

	var backstageArea = $("#backstageArea");

	// override user button (logged in) to show username
	var userBtn = $(".backstageTask[task=user]").
		html('<span>%0<span class="txtUserName" /></span>'.format([
			config.tasks.user.text]));
	config.macros.option.handler($(".txtUserName", userBtn)[0], null, ["txtUserName"]);

	// override show button with an svg image
	var showBtn = $("#backstageShow")[0];
	var altText = $(showBtn).text();
	$(showBtn).empty();
	imageMacro.renderImage(showBtn, "backstage.svg",
		{ alt: altText, width: 60, height: 60 });

	// override hide button
	var hideBtn = $("#backstageHide")[0];
	altText = $(hideBtn).text();
	$(hideBtn).empty();
	imageMacro.renderImage(hideBtn, "close.svg",
		{ alt: altText, width: 24, height: 24 });

	var backstageToolbar = $("#backstageToolbar")[0];
	var backstageLogo = $('<div id="backstageLogo" />').
		prependTo(backstageToolbar)[0];
	var iconName = readOnly ? "publicIcon" : "privateAndPublicIcon";
	imageMacro.renderImage(backstageLogo, iconName, { width: 24, height: 24 });
	// construct the tiddlyspace logo
	$('<span class="logoText"><span class="privateLightText">tiddly</span>' +
			'<span class="publicLightText">space</span></span>').
		appendTo(backstageLogo);

	// override space button to show SiteIcon
	var siteIcon = store.getTiddler("SiteIcon");
	if(siteIcon) {
		var spaceName = tiddlyspace.currentSpace.name;
		var btn = $("[task=space]", backstageArea);
		btn.empty();
		var uri = "/bags/%0_public/tiddlers/SiteIcon".format([spaceName]);
		imageMacro.renderImage(btn[0], uri,
			{ imageClass:"spaceSiteIcon", height: 24, width: 24 });
		$("<span />").html(config.tasks.space.text).appendTo(btn);
		$('<span class="spaceName" />').text(spaceName).appendTo(btn);
	}

	tweb.getUserInfo(function(user) {
		if(!user.anon) {
			var src = tiddlyspace.getAvatar(tweb.status.server_host, user.name);
			var container = $("<span />").appendTo("[task=user]", backstageArea)[0];
			imageMacro.renderImage(container, src,
				{ imageClass:"userSiteIcon", height: 24, width: 24 });
		}

		// override login button to show default avatar
		var loginBtn = $("[task=login]", backstageArea);
		loginBtn.html("<span>%0</span>".format([config.tasks.login.text]));
		imageMacro.renderImage(loginBtn[0], "/bags/common/tiddlers/defaultUserIcon",
			{ imageClass:"userSiteIcon", height: 24, width: 24 });

		var tasks = $(".backstageTask");
		for(var i = 0; i < tasks.length; i++) {
			var btn = $(tasks[i]);
			var taskName = btn.attr("task");
			btn.addClass("task_%0".format([taskName]));
		}
	});
};

})(jQuery);
//}}}
