/***
|''Name''|TiddlySpaceBackstage|
|''Version''|0.5.8|
|''Description''|Provides a TiddlySpace version of the backstage and a homeLink macro|
|''Status''|@@beta@@|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/raw/master/src/plugins/TiddlySpaceBackstage.js|
|''Requires''|TiddlySpaceConfig ImageMacroPlugin|
!Code
***/
//{{{
(function($) {

var disabled_tabs_for_nonmembers = ["PluginManager", "Backstage##FileImport", "Backstage##BatchOps",
	"Backstage##SpaceMembers", "TiddlySpaceTabs##Private", "TiddlySpaceTabs##Drafts"];
var tweb = config.extensions.tiddlyweb;
var tiddlyspace = config.extensions.tiddlyspace;
var imageMacro = config.macros.image;

if(config.options.chkBackstage === undefined) {
	config.options.chkBackstage = true;
}
config.tasks.login = {
	text: "login",
	tooltip: "TiddlySpace login",
	content: "<<tiddler Backstage##Login>>"
};

config.tasks.user = {
	text: "user: ",
	tooltip: "user control panel",
	content: "<<tiddler Backstage##User>>"
};

config.tasks.space = {
	text: "space: ",
	tooltip: "space control panel",
	content: "<<tiddler Backstage##Space>>",
	className: "right"
};

config.tasks.tiddlyspace = {
	text: "",
	tooltip: "",
	content: "<<tiddler Backstage##Menu>>"
}

config.backstageTasks = ["login", "tiddlyspace", "user", "space"];

config.messages.backstage.prompt = "";
// initialize state
var _show = backstage.show;
backstage.show = function() {
	// selectively hide backstage tasks and tabs based on user status
	var tasks = $("#backstageToolbar .backstageTask").show();
	tweb.getUserInfo(function(user) {
		if(user.anon) {
			$(".task_user", tasks).hide();
			tiddlyspace.disableTab(disabled_tabs_for_nonmembers);
		} else {
			$(".task_login", tasks).hide();
		}
	});
	// display backstage
	return _show.apply(this, arguments);
};
if(readOnly) {
	tiddlyspace.disableTab(disabled_tabs_for_nonmembers);
}

var _init = backstage.init;
var tasks = config.tasks;
var commonUrl = "/bags/common/tiddlers/%0";

backstage.tiddlyspace = {
	locale: {
		member: "You are a member of this space.",
		nonmember: "You are a non-member of this space.",
		loggedout: "You are currently logged out of TiddlySpace."
	},
	userButton: function(backstageArea, user) {
		// override user button (logged in) to show username
		var userBtn = $("[task=user]", backstageArea).empty();
		if(user.anon) {
			userBtn.remove();
		} else {
			$("<span />").text(tasks.user.text).appendTo(userBtn);
			$("<span />").addClass("txtUserName").text(user.name).appendTo(userBtn);
			var container = $("<span />").appendTo(userBtn)[0];
			tiddlyspace.renderAvatar(container, user.name, { imageOptions: { imageClass:"userSiteIcon", height: 24, width: 24 }, 
				labelOptions: { include: false } });
		}
	},
	showButton: function() {
		var showBtn = $("#backstageShow")[0];
		var altText = $(showBtn).text();
		$(showBtn).empty();
		imageMacro.renderImage(showBtn, "backstage.svg",
			{ altImage: commonUrl.format(["backstage.png"]), alt: altText, width: 60, height: 60 });
	},
	hideButton: function() {
		var hideBtn = $("#backstageHide")[0];
		altText = $(hideBtn).text();
		$(hideBtn).empty();
		imageMacro.renderImage(hideBtn, "close.svg",
			{ altImage: commonUrl.format(["close.png"]), alt: altText, width: 24, height: 24 });
	},
	middleButton: function(backstageArea) {
		var locale = backstage.tiddlyspace.locale;
		var backstageToolbar = $("#backstageToolbar", backstageArea)[0];
		var backstageLogo = $("#[task=tiddlyspace]").empty()[0];
		var iconName = readOnly ? "publicIcon" : "privateAndPublicIcon";
		var space = tiddlyspace.currentSpace.name;
		tweb.getUserInfo(function(user) {
			if(!user.anon) {
				config.messages.memberStatus = readOnly ? locale.nonmember : locale.member;
			} else {
				config.messages.memberStatus = locale.loggedout;
			}
		});
		imageMacro.renderImage(backstageLogo, iconName, { width: 24, height: 24 });
		$(".image", backstageLogo);
		// construct the tiddlyspace logo
		$('<span class="logoText"><span class="privateLightText">tiddly</span>' +
				'<span class="publicLightText">space</span></span>').
			appendTo(backstageLogo);
	},
	spaceButton: function(backstageArea) {
		// override space button to show SiteIcon
		var spaceName = tiddlyspace.currentSpace.name;
		var btn = $("[task=space]", backstageArea);
		btn.empty();
		tiddlyspace.renderAvatar(btn[0], spaceName, { imageOptions: { imageClass:"spaceSiteIcon", height: 24, width: 24 }, 
			labelOptions: { include: false } });
		$("<span />").text(tasks.space.text).appendTo(btn);
		$("<span />").addClass("spaceName").text(spaceName).appendTo(btn);
	},
	loginButton: function(backstageArea, user) {
		var loginBtn = $("[task=login]", backstageArea).empty();
		if(user.anon) {
			$("<span />").text(tasks.login.text).appendTo(loginBtn);
			var container = $("<span />").appendTo(loginBtn)[0];
			imageMacro.renderImage(container, commonUrl.format(["defaultUserIcon"]),
				{ imageClass:"userSiteIcon", height: 24, width: 24 });
		} else {
			loginBtn.remove();
		}
	},
	addClasses: function(backstageArea) {
		var tasks = $(".backstageTask", backstageArea);
		for(var i = 0; i < tasks.length; i++) {
			var btn = $(tasks[i]);
			var taskName = btn.attr("task");
			btn.addClass("task_%0".format([taskName]));
		}
	}
};
backstage.init = function() {
	_init.apply(this, arguments);
	tweb.getUserInfo(function(user) {
		var backstageArea = $("#backstageArea")[0];
		var tiddlyspace_b = backstage.tiddlyspace;
		tiddlyspace_b.userButton(backstageArea, user);
		tiddlyspace_b.showButton();
		tiddlyspace_b.hideButton();
		tiddlyspace_b.middleButton(backstageArea);
		tiddlyspace_b.spaceButton(backstageArea);
		tiddlyspace_b.loginButton(backstageArea, user);
		tiddlyspace_b.addClasses(backstageArea); ///for IE styling purposes
	});
};

var home = config.macros.homeLink = {
	locale: {
		linkText: "your home"
	},
	handler: function(place) {
		var container = $("<span />").appendTo(place)[0];
		tweb.getUserInfo(function(user) {
			if(!user.anon && user.name != tiddlyspace.currentSpace.name) {
				createSpaceLink(container, user.name, null, home.locale.linkText);
			}
		});
	}
}
})(jQuery);
//}}}
