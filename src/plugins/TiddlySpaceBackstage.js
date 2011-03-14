/***
|''Name''|TiddlySpaceBackstage|
|''Version''|0.6.7|
|''Description''|Provides a TiddlySpace version of the backstage and a homeLink, and followSpace macro|
|''Status''|@@beta@@|
|''Contributors''|Jon Lister, Jon Robson, Colm Britton|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/raw/master/src/plugins/TiddlySpaceBackstage.js|
|''Requires''|TiddlySpaceConfig ImageMacroPlugin TiddlySpaceViewTypes|
!Code
***/
//{{{
(function($) {

if(!config.extensions.tiddlyweb.status.tiddlyspace_version) { // unplugged
	config.extensions.tiddlyweb.status.tiddlyspace_version = "<unknown>";
}
var disabled_tabs_for_nonmembers = ["PluginManager", "Backstage##FileImport",
	"Backstage##BatchOps", "Backstage##SpaceMembers",
	"TiddlySpaceTabs##Private", "TiddlySpaceTabs##Drafts"];
var tweb = config.extensions.tiddlyweb;
var tiddlyspace = config.extensions.tiddlyspace;
var currentSpace = tiddlyspace.currentSpace.name;
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
	unpluggedText: "unplugged user"
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
};

if(window.location.protocol == "file:") {
	config.unplugged = true; // TODO: move into extensions.tiddly{web/space} namespace!?
	config.tasks.space.content = "<<tiddler Backstage##SpaceUnplugged>>";
	config.tasks.user.content = "<<tiddler Backstage##UserUnplugged>>";
} else {
	config.tasks.space.content = "<<tiddler Backstage##Space>>";
	config.tasks.user.content = "<<tiddler Backstage##User>>";
}
config.backstageTasks = ["login", "tiddlyspace", "user", "space"];

config.messages.backstage.prompt = "";
// initialize state
var _show = backstage.show;
backstage.show = function() {
	// selectively hide backstage tasks and tabs based on user status
	var tasks = $("#backstageToolbar .backstageTask").show();
	if(!config.unplugged) {
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

var tasks = config.tasks;
var commonUrl = "/bags/common/tiddlers/%0";

// mock out renderAvatar if unavailable -- XXX: temporary hotfix, not a permanent solution!
tiddlyspace.renderAvatar = tiddlyspace.renderAvatar || function() {};

backstage.tiddlyspace = {
	locale: {
		member: "You are a member of this space.",
		nonmember: "You are not a member of this space.",
		loggedout: "You are currently logged out of TiddlySpace.",
		unplugged: "You are unplugged."
	},
	checkSyncStatus: function(tiddler) {
		var bs = backstage.tiddlyspace;
		var t = store.filterTiddlers("[is[unsynced]]");
		var unsyncedList = $("#backstage .tiddlyspaceMenu .unsyncedList");
		if(t.length > 0 && !readOnly) {
			bs.tweakMiddleButton("unsyncedIcon");
			$("#backstage").addClass("unsyncedChanges");
		} else {
			bs.tweakMiddleButton();
			$("#backstage").removeClass("unsyncedChanges");
		}
		refreshElements($("#backstage")[0]);
		if(tiddler) {
			var title = typeof(tiddler) === "string" ? tiddler : tiddler.title;
			var el = story.getTiddler(title) || false;
			if(el) {
				refreshElements(el);
			}
		}
	},
	userButton: function(backstageArea, user) {
		// override user button (logged in) to show username
		var userBtn = $("[task=user]", backstageArea).empty();
		if(config.unplugged && user.anon) {
			$("<span />").text(tasks.user.unpluggedText).appendTo(userBtn);
		} else if(!config.unplugged && user.anon) {
			userBtn.remove();
		} else {
			$("<span />").text(tasks.user.text).appendTo(userBtn);
			$("<span />").addClass("txtUserName").text(user.name).appendTo(userBtn);
			var container = $("<span />").appendTo(userBtn)[0];
			tiddlyspace.renderAvatar(container, user.name,
				{ imageOptions: { imageClass:"userSiteIcon", height: 24, width: 24 },
				labelOptions: { include: false } });
		}
	},
	showButton: function() {
		var showBtn = $("#backstageShow")[0];
		var altText = $(showBtn).text();
		$(showBtn).empty();
		imageMacro.renderImage(showBtn, "backstage.svg",
			{ altImage: commonUrl.format("backstage.png"), alt: altText, width: 60, height: 60 });
	},
	hideButton: function() {
		var hideBtn = $("#backstageHide")[0];
		altText = $(hideBtn).text();
		$(hideBtn).empty();
		imageMacro.renderImage(hideBtn, "close.svg",
			{ altImage: commonUrl.format("close.png"), alt: altText, width: 24, height: 24 });
	},
	middleButton: function(backstageArea, user) {
		var bs = backstage.tiddlyspace;
		var backstageToolbar = $("#backstageToolbar", backstageArea)[0];
		if(config.unplugged) {
			config.messages.memberStatus = bs.locale.unplugged;
		} else if(!user.anon) {
			config.messages.memberStatus = readOnly ? bs.locale.nonmember : bs.locale.member;
		} else {
			config.messages.memberStatus = bs.locale.loggedout;
		}
		// construct the tiddlyspace logo
		var backstageLogo = $("#[task=tiddlyspace]").empty()[0];
		$("<span />").addClass("iconContainer").appendTo(backstageLogo);
		$('<span class="logoText"><span class="privateLightText">tiddly</span>' +
				'<span class="publicLightText">space</span></span>').
			appendTo(backstageLogo);
		bs.tweakMiddleButton();
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
	spaceButton: function(backstageArea, user) {
		// override space button to show SiteIcon
		var btn = $("[task=space]", backstageArea).show();
		if(user && user.anon && config.unplugged) {
			btn.hide();
			return;
		}
		btn.empty();
		tiddlyspace.renderAvatar(btn[0], currentSpace,
			{ imageOptions: { imageClass:"spaceSiteIcon", height: 24, width: 24 },
			labelOptions: { include: false } });
		$("<span />").text(tasks.space.text).appendTo(btn);
		$("<span />").addClass("spaceName").text(currentSpace).appendTo(btn);
	},
	loginButton: function(backstageArea, user) {
		var loginBtn = $("[task=login]", backstageArea).empty();
		if(user.anon && !config.unplugged) {
			$("<span />").text(tasks.login.text).appendTo(loginBtn);
			var container = $("<span />").appendTo(loginBtn)[0];
			imageMacro.renderImage(container, commonUrl.format("defaultUserIcon"),
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
			btn.addClass("task_%0".format(taskName));
		}
	}
};

var _init = backstage.init;
backstage.init = function() {
	_init.apply(this, arguments);
	var init = function(user) {
		var backstageArea = $("#backstageArea")[0];
		var bs = backstage.tiddlyspace;
		store.addNotification(null, bs.checkSyncStatus);
		bs.userButton(backstageArea, user);
		bs.showButton();
		bs.hideButton();
		bs.middleButton(backstageArea, user);
		bs.spaceButton(backstageArea, user);
		bs.loginButton(backstageArea, user);
		bs.addClasses(backstageArea); // for IE styling purposes
		bs.checkSyncStatus();
	};
	tweb.getUserInfo(init);
};

var home = config.macros.homeLink = {
	locale: {
		linkText: "your home space"
	},
	handler: function(place) {
		var container = $("<span />").appendTo(place)[0];
		tweb.getUserInfo(function(user) {
			if(!user.anon && user.name != currentSpace) {
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
			var url = "%0/#%1:[[%2]]".format(host, paramifier, title);
			label = label ? label : title;
			$("<a />").attr("href", url).text(label).appendTo(container);
		});
	},
	make: function(container, username, space) {
		followLink.paramifiedLink(container, username, "@" + space,
			followLink.locale.label.format(space), "follow");
	},
	handler: function(place) {
		var container = $("<span />").appendTo(place)[0];
		tweb.getUserInfo(function(user) {
			var username = user.name;
			if(!user.anon && currentSpace != username) {
				followLink.make(place, username, currentSpace);
			}
		});
	}
};

config.macros.exportSpace = {
	handler: function(place, macroName, params) {
		var filename = params[0] ||
			"/?download=%0.html".format(currentSpace);
		$('<a class="button">download</a>'). // XXX: i18n
			attr("href", filename).appendTo(place);
	}
};

$.extend(config.messages, {
	syncExplanation: "You are currently viewing an offline version of this TiddlySpace. From here you can sync your offline copy with the online version.",
	syncListHeading: "Unsaved tiddlers listed below"});

var _reportSuccess = config.extensions.ServerSideSavingPlugin.reportSuccess;
config.extensions.ServerSideSavingPlugin.reportSuccess = function(msg, tiddler) {
	backstage.tiddlyspace.checkSyncStatus(tiddler);
	_reportSuccess.apply(this, arguments);
};

})(jQuery);
//}}}
