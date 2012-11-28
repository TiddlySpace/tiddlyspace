/***
|''Name''|TiddlySpaceBackstage|
|''Version''|0.8.0|
|''Description''|Provides a TiddlySpace version of the backstage and a homeLink macro|
|''Status''|@@beta@@|
|''Contributors''|Jon Lister, Jon Robson, Colm Britton|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/raw/master/src/plugins/TiddlySpaceBackstage.js|
|''Requires''|TiddlySpaceConfig ImageMacroPlugin TiddlySpaceViewTypes|
!StyleSheet
.tiddler .error.annotation .button{
	display: inline-block;
}

#backstageArea {
	z-index: 49;
	color: white;
	background-color: black;
	background: -webkit-gradient(linear,left bottom,left top,color-stop(0, #222),color-stop(0.5, #333),color-stop(1, #555));
	background: -moz-linear-gradient(center bottom,#222 0%, #333 50%, #555 100%);
	filter: progid:DXImageTransform.Microsoft.gradient(startColorstr=#ff555555, endColorstr=#ff222222);
	-ms-filter: "progid:DXImageTransform.Microsoft.gradient(startColorstr=#ff555555, endColorstr=#ff222222)";
	height: 25px;
	padding: 0;
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

#backstage ol,
#backstage ul {
	padding: auto;
}

#backstageButton a {
	margin: 0;
}

.backstagePanelBody ul {
	padding: 5px;
	margin: 5px;
}

#backstage #backstagePanel {
	margin-left: 5%;
	padding: 0em;
	margin-right: 5%;
}

#backstageToolbar a {
	position: relative;
}

#backstageArea a.backstageSelTab,
#backstageToolbar .backstageTask {
	line-height: 25px;
	color: #767676;
}

.backstageTask .externalImage,
.backstageTask .image {
	display: inline;
}

#backstageToolbar a span {
	z-index: 2;
}

a.backstageTask {
	display: inline;
        margin-left: 1em !important;
}

.backstagePanelBody .button {
	display: inline-block;
	margin-right: 10px;
}

.backstagePanelBody {
	margin: 0 0 0 0.6em;
	padding: 0.4em 0.5em 1px 0.5em;
}

#backstage table {
	margin: auto;
}

#backstage .wizard table {
	border: 0px;
	margin: 0;
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
!Code
***/
//{{{
(function ($) {
    var name = "StyleSheet" + tiddler.title;
    config.shadowTiddlers[name] = "/*{{{*/\n%0\n/*}}}*/".
        format(store.getTiddlerText(tiddler.title + "##StyleSheet")); // this accesses the StyleSheet section of the current tiddler (the plugin that contains it)
    store.addNotification(name, refreshStyles);

    if (!config.extensions.tiddlyweb.status.tiddlyspace_version) { // unplugged
        config.extensions.tiddlyweb.status.tiddlyspace_version = "<unknown>";
        config.extensions.tiddlyweb.status.server_host = {
            url:config.extensions.tiddlyweb.host }; // TiddlySpaceLinkPlugin expects this
    }
    var disabled_tasks_for_nonmembers = ["tiddlers", "plugins", "batch", "sync"];

    var tweb = config.extensions.tiddlyweb;
    var tiddlyspace = config.extensions.tiddlyspace;
    var currentSpace = tiddlyspace.currentSpace.name;
    var imageMacro = config.macros.image;

    if (config.options.chkBackstage === undefined) {
        config.options.chkBackstage = false;
    }

// Set up Backstage
    config.tasks = {};
    config.tasks.status = {
        text:"status",
        tooltip:"TiddlySpace Info",
        content:"<<tiddler Backstage##Menu>>"
    };
    config.tasks.tiddlers = {
        text:"tiddlers",
        tooltip:"tiddlers control panel",
        content:"<<tiddler Backstage##BackstageTiddlers>>"
    };
    config.tasks.plugins = {
        text:"plugins",
        tooltip:"Manage installed plugins",
        content:"<<tiddler Backstage##Plugins>>"
    };
    config.tasks.batch = {
        text:"batch",
        tooltip:"Batch manage public/private tiddlers",
        content:"<<tiddler Backstage##BatchOps>>"
    };
    config.tasks.tweaks = {
        text:"tweaks",
        tooltip:"Tweak TiddlyWiki behaviors",
        content:"<<tiddler Backstage##Tweaks>>"
    };
    config.tasks.exportTiddlers = {
        text:"import/export",
        tooltip:"Import/export tiddlers from/to a TiddlyWiki",
        content:"<<tiddler Backstage##ImportExport>>"
    };
    config.tasks.sync = {
        text:"sync",
        tooltip:"Check Sync status",
        content:"<<tiddler Backstage##SpaceUnplugged>>"
    };

    if (window.location.protocol === "file:") {
        config.unplugged = true;
    }

    config.backstageTasks = ["status", "tiddlers", "plugins",
        "batch", "tweaks", "exportTiddlers", "sync"];

    config.messages.backstage.prompt = "";
// initialize state
    var _show = backstage.show;
    backstage.show = function () {
        // selectively hide backstage tasks and tabs based on user status
        var tasks = $("#backstageToolbar .backstageTask").show();
        var bs = backstage.tiddlyspace;
        if (!config.unplugged) {
            tweb.getUserInfo(function (user) {
                if (user.anon) {
                    jQuery.each(disabled_tasks_for_nonmembers, function (i, task) {
                        var taskIndex = config.backstageTasks.indexOf(task);
                        if (taskIndex !== -1) {
                            config.backstageTasks.splice(taskIndex, 1);
                        }
                    });
                    config.messages.memberStatus = bs.locale.loggedout;
                } else {
                    config.messages.memberStatus = readOnly ?
                        bs.locale.nonmember : bs.locale.member;
                }
            });
        } else {
            config.messages.memberStatus = bs.locale.unplugged;
        }

        // display backstage
        return _show.apply(this, arguments);
    };
    if (readOnly) {
        jQuery.each(disabled_tasks_for_nonmembers, function (i, task) {
            var taskIndex = config.backstageTasks.indexOf(task);
            if (taskIndex !== -1) {
                config.backstageTasks.splice(taskIndex, 1);
            }
        });
    }

    var tasks = config.tasks;
    var commonUrl = "/bags/common/tiddlers/%0";

    backstage.tiddlyspace = {
        locale:{
            member:"You are a member of this space.",
            nonmember:"You are not a member of this space.",
            loggedout:"You are currently logged out of TiddlySpace.",
            unplugged:"You are unplugged."
        },
        showButton:function () {
            var showBtn = $("#backstageShow")[0];
            var altText = $(showBtn).text();
            $(showBtn).empty();
            imageMacro.renderImage(showBtn, "backstage.svg",
                { altImage:commonUrl.format("backstage.png"), alt:altText});
        },
        hideButton:function () {
            var hideBtn = $("#backstageHide")[0];
            var altText = $(hideBtn).text();
            $(hideBtn).empty();
            imageMacro.renderImage(hideBtn, "close.svg",
                { altImage:commonUrl.format("close.png"), alt:altText, width:24, height:24 });
        }
    };

    var _init = backstage.init;
    backstage.init = function () {
        _init.apply(this, arguments);
        var init = function (user) {
            var bs = backstage.tiddlyspace;
            bs.showButton();
            bs.hideButton();
        };
        tweb.getUserInfo(init);
    };

    var home = config.macros.homeLink = {
        locale:{
            linkText:"your home space"
        },
        handler:function (place) {
            var container = $("<span />").appendTo(place)[0];
            tweb.getUserInfo(function (user) {
                if (!user.anon && user.name !== currentSpace) {
                    createSpaceLink(container, user.name, null, home.locale.linkText);
                }
            });
        }
    };

    config.macros.exportSpace = {
        handler:function (place, macroName, params) {
            var filename = params[0] ||
                "/tiddlers.wiki?download=%0.html".format(currentSpace);
            $('<a class="button">download</a>').// XXX: i18n
                attr("href", filename).appendTo(place);
        }
    };

}(jQuery));
//}}}
