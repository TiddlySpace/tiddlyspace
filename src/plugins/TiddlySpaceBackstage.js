/***
|''Name''|TiddlySpaceBackstage|
|''Version''|0.8.0|
|''Description''|Provides a TiddlySpace version of the backstage and a homeLink macro|
|''Status''|@@beta@@|
|''Contributors''|Jon Lister, Jon Robson, Colm Britton|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/raw/master/src/plugins/TiddlySpaceBackstage.js|
|''Requires''|TiddlySpaceConfig ImageMacroPlugin TiddlySpaceViewTypes|
!StyleSheet
.publicLightText {
	color: #C0E5FC;
}

.privateLightText {
	color: #E2C1D6;
}

.tiddler .error.annotation .button{
	display: inline-block;
}

#backstageArea #backstageToolbar a.task_tiddlyspace {
	margin: 0px auto auto -75px;
	font-weight: bold;
	width: 150px;
	line-height:24px;
	font-size: 1.2em;
	padding: 0;
	top: 0;
	position: absolute;
	left: 50%;
}

.task_tiddlyspace .image,
.task_tiddlyspace .svgIcon {
	display: inline;
}

.task_tiddlyspace .svgIconText {
	display: none;
}

.task_tiddlyspace .logoText {
	position: absolute;
	top: 0px;
	margin-left: 5px;
}

#backstageArea {
	z-index: 49;
	color: white;
	background-color: black;
	background: -webkit-gradient(linear,left bottom,left top,color-stop(0, #222),color-stop(0.5, #333),color-stop(1, #555));
	background: -moz-linear-gradient(center bottom,#222 0%, #333 50%, #555 100%);
	filter: progid:DXImageTransform.Microsoft.gradient(startColorstr=#ff555555, endColorstr=#ff222222);
	-ms-filter: "progid:DXImageTransform.Microsoft.gradient(startColorstr=#ff555555, endColorstr=#ff222222)";
	height: 24px;
	padding: 0;
	border-bottom: solid 1px black;
}

.backstageBackground {
	fill: black;
}

#backstageButton {
	overflow: hidden;
}

#backstageButton #backstageShow,
#backstageButton #backstageHide {
	margin: 0px;
	padding: 0px;
}

#backstageButton #backstageShow:hover,
#backstageButton #backstageHide:hover {
	background: none;
	color: none;
}

#backstageButton img,
#backstageButton svg {
	width: 24px;
	height: 24px;
}

#messageArea {
	top: 50px;
}

#backstageToolbar {
	position: relative;
}

#backstageArea a {
	padding: 0px;
	margin-left: 0px;
	color: white;
	background: none;
}

#backstageArea a:hover {
	background-color: white;
}

#backstage .tabContents ol,
#backstage .tabContents ul {
	padding: auto;
}

#backstageButton a {
	margin: 0;
}

.backstagePanelBody .tabContents ul {
	padding: 5px;
	margin: 5px;
}

#backstage #backstagePanel {
	margin-left: 5%;
	padding: 0em;
	margin-right: 5%;
	text-align: center;
}

#backstageToolbar a {
	position: relative;
}

#backstageArea a.backstageSelTab,
#backstageToolbar .backstageTask {
	line-height: 24px;
	color: #767676;
}

.backstageTask .externalImage,
.backstageTask .image {
	display: inline;
}

.backstageTask .txtUserName,
.backstageTask .spaceName {
	color: #fff;
}

.backstageSelTab .txtUserName,
.backstageSelTab .spaceName,
a:hover .txtUserName,
a:hover .spaceName {
	color: #000;
}

.spaceSiteIcon {
	margin-right: 10px;
}

.userSiteIcon {
	margin-left: 10px;
}

#backstageToolbar .task_space {
	position: absolute;
	top: 0px;
	left: 0%;
}

#backstageToolbar .task_user,
#backstageToolbar .task_login {
	display: block;
	position: absolute;
	top: 0px;
	right: 5%;
}

#backstageToolbar .task_login img {
	position: relative;
	display: inline;
}

#backstageToolbar .task_login img,
#backstageToolbar .task_user img {
	float: right;
}

#backstageToolbar .task_space .svgIcon {
	float: left;
	position: relative;
	z-index: 2;
}

#backstageToolbar a span {
	z-index: 2;
}

#backstageToolbar .spaceSiteIcon {
	float: left;
}

a.backstageTask {
	display: block;
}

#backstageToolbar a span.txtUserName,
#backstageToolbar a .txtUserName span {
	display: inline;
	float: none;
}

#backstage .deleteButton {
	margin-left: 0.3em;
	font-weight: bold;
	color: red;
	font-size: 1.6em;
}

#backstage .deleteButton:hover {
	background: none;
}

#backstageArea .siteIcon {
	display: inline;
}

#backstagePanel .TiddlySpaceLogin {
	display: inline;
}

.backstagePanelBody .tabContents .button {
	display: inline-block;
	margin-right: 10px;
}

.backstagePanelBody .tab {
	margin: 0 0 0 0.6em;
	padding: 0.4em 0.5em 1px 0.5em;
}

#backstage .tabContents {
	padding: 1.5em;
	text-align: left;
}

#backstage table {
	margin: auto;
}

#backstage .wizard table {
	border: 0px;
	margin: 0;
}

#backstage .txtSpaceTab li {
	border: 1px solid #ddd;
	background: #eee;
	list-style: none;
	margin: 0.5em;
	padding: 0.5em;
	width: 80%;
}

#backstage .txtSpaceTab li.annotation {
	border: 2px solid [[ColorPalette::SecondaryMid]];
}

#backstage div  li.listLink {
	border: 0px;
	width: 78%;
	font-size: 0.7em;
}

#backstage div li.listTitle {
	font-weight: bold;
	text-decoration: underline;
	font-size: 1em;
	background: #ccc;
	width: 100%;
}

#backstage div.txtSpaceTab li .deleteButton {
	float: right;
}

#backstage fieldset {
	border: solid 1px [[ColorPalette::Background]];
}

#backstage .viewer table,#backstage table.twtable {
	border: 0px;
}

#backstageToolbar img {
	padding: 0;
}

#backstage .wizard,
#backstage .wizardFooter {
	background: none;
}

.viewer td, .viewer tr, .twtable td, .twtable tr {
	border: 1px solid #eee;
}

#backstage .inlineList ul li {
	background-color: [[ColorPalette::Background]];
	border: solid 1px [[ColorPalette::TertiaryMid]];
	display: block;
	float: left;
	list-style: none;
	margin-right: 1em;
	padding: 0.5em;
}

.backstageClear, .inlineList form {
	clear: both;
	display: block;
	margin-top: 3em;
}

.tiddlyspaceMenu {
	text-align: center;
}

span.chunkyButton {
	display: inline-block;
	padding: 0;
	margin: 0;
	border: solid 2px #000;
	background-color: #04b;
}

span.chunkyButton a.button, span.chunkyButton a:active.button {
	white-space: nowrap;
	font-weight: bold;
	font-size: 1.8em;
	color: #fff;
	text-align: center;
	padding: 0.5em 0.5em;
	margin: 0;
	border-style: none;
	display: block;
}

span.chunkyButton:hover {
	background-color: #014;
}

span.chunkyButton a.button:hover {
	border-style: none;
	background: none;
	color: #fff;
}

a.baskstageTask.task_login,
a.baskstageTask.task_user {
	_width: 200px;
	_text-align: right;
}

#backstageArea #backstageToolbar .task_login img,
#backstageArea #backstageToolbar .task_user img {
	_display: inline;
	_float: none;
}

#backstage .unpluggedSpaceTab .wizard,
.unpluggedSpaceTab .wizard {
	background: white;
	border: 2px solid #CCC;
	padding: 5px;
}

.syncKey .keyItem {
	border: 1px solid black;
	display: inline-block;
	margin: 0.2em;
	padding: 0.1em 0.1em 0.1em 0.1em;
}

.keyHeading {
	font-size: 2em;
	font-weight: bold;
	margin: 0.4em 0em -0.2em;
}

.unpluggedSpaceTab .putToServer,
.unpluggedSpaceTab .notChanged {
	display: none;
}

.tiddlyspaceMenu ul {
	margin: 0;
	padding: 0;
}

.tiddlyspaceMenu ul li {
	list-style: none;
}

.unsyncedChanges .unsyncedList {
	display: block;
}

.unsyncedList {
	display: none;
}

#backstage iframe {
	height: 600px;
	width: 100%;
	border: none;
}
!Code
***/
//{{{
(function($) {
var name = "StyleSheet" + tiddler.title;
config.shadowTiddlers[name] = "/*{{{*/\n%0\n/*}}}*/".
	format(store.getTiddlerText(tiddler.title + "##StyleSheet")); // this accesses the StyleSheet section of the current tiddler (the plugin that contains it)
store.addNotification(name, refreshStyles);

if(!config.extensions.tiddlyweb.status.tiddlyspace_version) { // unplugged
	config.extensions.tiddlyweb.status.tiddlyspace_version = "<unknown>";
	config.extensions.tiddlyweb.status.server_host = {
		url: config.extensions.tiddlyweb.host }; // TiddlySpaceLinkPlugin expects this
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

config.tasks.user = {
	text: "user: ",
	tooltip: "user control panel",
	unpluggedText: "unplugged user",
	content: "<html><iframe frameBorder='0' src='" + config.extensions.tiddlyweb.host + "/_account'></iframe></html>"
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
} else {
	config.tasks.space.content = "<html><iframe frameBorder='0' src='/_space'></iframe></html>";
}
config.backstageTasks = ["tiddlyspace", "user", "space"];

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
			{ altImage: commonUrl.format("backstage.png"), alt: altText});
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

config.extensions.ServerSideSavingPlugin.reportSuccess = function(msg, tiddler) {
	backstage.tiddlyspace.checkSyncStatus(tiddler);
	msg = config.extensions.ServerSideSavingPlugin.locale[msg];
	var link = "/" + encodeURIComponent(tiddler.title);
	displayMessage(msg.format([tiddler.title]), link);
};

})(jQuery);
//}}}
