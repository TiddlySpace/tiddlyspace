/***
|''Name''|TiddlySpaceBackstage|
|''Version''||
|''Description''|Provides a TiddlySpace version of the backstage|
|''Status''|//unknown//|
|''Source''|http://github.com/TiddlySpace/tiddlyspace|
|''Requires''|TiddlySpaceConfig|
!Code
***/
//{{{
(function($) {

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
	config.extensions.tiddlyweb.getUserInfo(function(user) {
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
	invokeMacro(showBtn, "image", "backstage.svg 60 60 alt:%0".format([altText]), null);

	// override hide button
	var hideBtn = $("#backstageHide")[0];
	altText = $(hideBtn).text();
	$(hideBtn).empty();
	invokeMacro(hideBtn, "image", "close.svg 25 25 alt:%0".format([altText]), null);

	var backstageToolbar = $("#backstageToolbar")[0];
	$("<div id='backstageLogo' />").prependTo(backstageToolbar);
	wikify("<<image tiddlyspace.svg 16 16>> ''{{privateLightText{tiddly}}}{{publicLightText{space}}}''",
		$("#backstageLogo", backstageToolbar)[0]); // XXX: macro invocation is evil

	// override space button to show SiteIcon
	var siteIcon = store.getTiddler("SiteIcon");
	if(siteIcon) {
		var btn = $("[task=space]", backstageArea);
		btn.empty();
		$('<img class="spaceSiteIcon" />').
			attr("src", "SiteIcon").appendTo(btn);
		$("<span />").html(config.tasks.space.text).appendTo(btn);
		$('<span class="spaceName" />').text(config.extensions.tiddlyspace.currentSpace.name).
			appendTo(btn);

	}

	var tiddlyweb = config.extensions.tiddlyweb;
	tiddlyweb.getStatus(function(status) { // XXX: redundant due to getUserInfo!?
		tiddlyweb.getUserInfo(function(user) {
			// show avatar in the user's public bag
			if(!user.anon) { // XXX: duplication of TiddlySpaceVisualization:getAvatar!?
				var src = "%0/recipes/%1_public/tiddlers/SiteIcon".
					format([tiddlyweb.status.server_host.url, user.name]);
				$('<img class="userSiteIcon" />').attr("src", src).appendTo("<span />").
					appendTo("[task=user]", backstageArea);
			}
		});

		// override login button to show default avatar
		var loginBtn = $("[task=login]", backstageArea);
		loginBtn.html('<span>%0</span><img class="userSiteIcon" src="/bags/tiddlyspace/tiddlers/SiteIcon" />'.
			format([config.tasks.login.text]));

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
