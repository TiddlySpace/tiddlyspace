/***
|''Name''|TiddlySpaceBackstage|
|''Version''|0.6.1|
|''Description''|Provides a TiddlySpace version of the backstage and a homeLink, and followSpace macro|
|''Status''|@@beta@@|
|''Contributors''|Jon Lister, Jon Robson, Colm Britton|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/raw/master/src/plugins/TiddlySpaceBackstage.js|
|''Requires''|TiddlySpaceConfig ImageMacroPlugin TiddlySpaceViewTypes|
!Code
***/
//{{{
(function($) {

if(!config.extensions.tiddlyweb.status) {
	config.extensions.tiddlyweb.status = {};
}
if(!config.extensions.tiddlyweb.status.tiddlyspace_version) {
	config.extensions.tiddlyweb.status.tiddlyspace_version = "<unknown>" // for unplugged usage.
}
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
	tooltip: "user control panel"
};

config.tasks.space = {
	text: "space: ",
	tooltip: "space control panel",
	className: "right"
};

config.tasks.tiddlyspace = {
	text: "",
	tooltip: "",
	content: "<<tiddler Backstage##Menu>>"
}

if(window.location.protocol == "file:") {
	config.unplugged = true;
	config.tasks.space.content = "<<tiddler Backstage##SpaceUnplugged>>";
	config.tasks.user.content = "<<tiddler Backstage##UserUnplugged>>";
} else {
	config.tasks.space.content = "<<tiddler Backstage##Space>>";
	config.tasks.user.content = "<<tiddler Backstage##User>>";
}
var unpluggedMode = config.unplugged;
config.backstageTasks = ["login", "tiddlyspace", "user", "space"];

config.messages.backstage.prompt = "";
// initialize state
var _show = backstage.show;
backstage.show = function() {
	// selectively hide backstage tasks and tabs based on user status
	var tasks = $("#backstageToolbar .backstageTask").show();
	if(!unpluggedMode) {
		tweb.getUserInfo(function(user) {
			if(user.anon) {
				$(".task_user", tasks).hide();
				tiddlyspace.disableTab(disabled_tabs_for_nonmembers);
			} else {
				$(".task_login", tasks).hide();
			}
		});
	}
	// display backstage
	return _show.apply(this, arguments);
};
if(readOnly) {
	tiddlyspace.disableTab(disabled_tabs_for_nonmembers);
}

var _init = backstage.init;
var tasks = config.tasks;
var commonUrl = "/bags/common/tiddlers/%0";

// mock out renderAvatar if unavailable -- XXX: temporary hotfix, not a permanent solution!
tiddlyspace.renderAvatar = tiddlyspace.renderAvatar || function() {};

backstage.tiddlyspace = {
	locale: {
		member: "You are a member of this space.",
		nonmember: "You are a non-member of this space.",
		loggedout: "You are currently logged out of TiddlySpace.",
		unplugged: "You are unplugged."
	},
	checkSyncStatus: function() {
		var b = backstage.tiddlyspace;
		var t = store.filterTiddlers("[is[unsynced]]");
		var unsyncedList = $("#backstage .tiddlyspaceMenu .unsyncedList");
		if(t.length > 0 && !readOnly) {
			b.tweakMiddleButton("unsyncedIcon");
			$("#backstage").addClass("unsyncedChanges");
		} else {
			b.tweakMiddleButton();
			$("#backstage").removeClass("unsyncedChanges");
		}
		story.refreshAllTiddlers();
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
	middleButton: function(backstageArea, user) {
		var b = backstage.tiddlyspace;
		var locale = b.locale;
		var backstageToolbar = $("#backstageToolbar", backstageArea)[0];
		var space = tiddlyspace.currentSpace.name;
		if(user.unplugged) {
			config.messages.memberStatus = locale.unplugged;
		} else if(!user.anon) {
			config.messages.memberStatus = readOnly ? locale.nonmember : locale.member;
		} else {
			config.messages.memberStatus = locale.loggedout;
		}
		// construct the tiddlyspace logo
		var backstageLogo = $("#[task=tiddlyspace]").empty()[0];
		$("<span />").addClass("iconContainer").appendTo(backstageLogo);
		$('<span class="logoText"><span class="privateLightText">tiddly</span>' +
				'<span class="publicLightText">space</span></span>').
			appendTo(backstageLogo);
		b.tweakMiddleButton();
	},
	tweakMiddleButton: function(iconName) {
		var backstageLogo = $("#[task=tiddlyspace] .iconContainer").empty()[0];
		var backstageToolbar = $("#backstageToolbar");
		var plugin = backstage.tiddlyspace;
		if(!iconName) {
			iconName = readOnly ? "publicIcon" : "privateAndPublicIcon";
		}
		config.macros.image.renderImage(backstageLogo, iconName, { width: 24, height: 24 });
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
	var init = function(user) {
		var backstageArea = $("#backstageArea")[0];
		var b = backstage.tiddlyspace;
		store.addNotification(null, b.checkSyncStatus);
		b.userButton(backstageArea, user);
		b.showButton();
		b.hideButton();
		b.middleButton(backstageArea, user);
		b.spaceButton(backstageArea);
		b.loginButton(backstageArea, user);
		b.addClasses(backstageArea); // for IE styling purposes
		b.checkSyncStatus();
	};
	if(!unpluggedMode) {
		tweb.getUserInfo(init);
	} else {
		init({unplugged: true, anon:false, name: config.options.txtUserName});
	}
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
};

var followLink = config.macros.followSpace = {
	locale: {
		label: "follow %0"
	},
	paramifiedLink: function(container, space, title, label, paramifier) {
		tweb.getStatus(function(status) {
			var host = config.extensions.tiddlyspace.getHost(status.server_host, space);
			var url = "%0/#%1:[[%2]]".format([host, paramifier, title]);
			label = label ? label : title;
			$("<a />").attr("href", url).text(label).appendTo(container);
		});
	},
	make: function(container, username, space) {
		followLink.paramifiedLink(container, username, "@" + space,
			followLink.locale.label.format([space]), "follow");
	},
	handler: function(place) {
		var container = $("<span />").appendTo(place)[0];
		tweb.getUserInfo(function(user) {
			var space = tiddlyspace.currentSpace.name;
			var username = user.name;
			if(!user.anon && space != username) {
				followLink.make(place, username, space);
			}
		});
	}
};

config.macros.exportSpace = {
	handler: function(place, macroName, params) {
		var filename = params[0] ||
			"/?download=%0.html".format([tiddlyspace.currentSpace.name]);
		$('<a class="button">download</a>'). // XXX: i18n
			attr("href", filename).appendTo(place);
	}
};

$.extend(config.messages, {
	syncExplanation: "You are currently viewing an offline version of this TiddlySpace. From here you can sync your offline copy with the online version.",
	syncListHeading: "Unsaved tiddlers listed below"});

var tmp_reportSuccess = config.extensions.ServerSideSavingPlugin.reportSuccess;
config.extensions.ServerSideSavingPlugin.reportSuccess = function() {
	backstage.tiddlyspace.checkSyncStatus();
	tmp_reportSuccess.apply(this, arguments);
};

})(jQuery);
//}}}
