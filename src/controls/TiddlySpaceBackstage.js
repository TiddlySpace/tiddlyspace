/***
|''Requires''|TiddlySpaceConfig|
***/
//{{{
(function($) {
config.options.chkBackstage = true;
config.backstageTasks = [];

config.tasks.login = {
	text: "login",
	tooltip: "TiddlySpace login",
	content: "<<tiddler BackstageLogin>>"
};
config.backstageTasks.push("login");

config.tasks.user = {
	text: "user: ",
	tooltip: "user control panel",
	content: "<<tiddler BackstageUser>>"
};
config.backstageTasks.push("user");

config.tasks.space = {
	text: "space: "+config.extensions.tiddlyspace.currentSpace.name,
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
			tasks.slice(1, 3).hide();
		} else {
			tasks.eq(0).hide();
		}
	});
	// display backstage
	return _show.apply(this, arguments);
};

var _init = backstage.init;
backstage.init = function(){
	var result = _init.apply(this, arguments);
	
	//update usernames
	var userButton = $(".backstageTask[task=user]").
	html(config.tasks.user.text+ "<span class='txtUserName'></span>"+ glyph("downTriangle"));
	config.macros.option.handler($(".txtUserName",userButton)[0],null,["txtUserName"]);
	
	//make the backstage become visible when you mouseover it
	var _revealBackstageArea;
	$("#backstageButton").mouseover(function(e){ //when mouseover the button set a timeout to show backstage
		if(!backstage.isVisible()){
			_revealBackstageArea = window.setTimeout(function(){
				if(!backstage.isVisible())backstage.show();
			},"600");}
		}
	).
	mouseout(function(e){ //on a mouseout we prevent showing of the backstage.
		if(_revealBackstageArea){
			window.clearTimeout(_revealBackstageArea);
		}
	});
	
	//override show button with an svg image
	var showButton = $("#backstageShow")[0];
	$(showButton).html("");
	wikify("<<image backstage.svg 60 60>>",showButton);
	
	//override hide button
	var hideButton =$("#backstageHide")[0];
	jQuery(hideButton).html("");
	wikify("<<image close.svg 25 25>>",hideButton);
	
	var backstageToolbar = $("#backstageToolbar")[0];
	$("<div id='backstageLogo'></div>").prependTo(backstageToolbar);
	wikify("<<image tiddlyspace.svg 16 16>> ''{{privateLightText{tiddly}}}{{publicLightText{space}}}''",$("#backstageLogo",backstageToolbar)[0]);
	
	var siteIcon =store.getTiddler("SiteIcon") 
	if(siteIcon){
		wikify(siteIcon.text,jQuery("[task=space]","#backstageArea")[0]);
	}
	
	var host = config.defaultCustomFields['server.host'];
	var subdomainStart = host.indexOf(".");
	var addressStart = host.indexOf("/") + 2;
	var tsHost = host.substr(0,addressStart)+ host.substr(subdomainStart+1);
	
	//show avatar in the users public bag
	jQuery("[task=user]","#backstageArea").append('<span><img src="'+tsHost+'/recipes/'+config.options.txtUserName+'_public/tiddlers/SiteIcon"/></span><br/>');
	//show default avatar for the login button
	jQuery("[task=login]","#backstageArea").append('<span><img src="'+tsHost+'/bags/tiddlyspace/tiddlers/SiteIcon"/></span><br/>');
	
}

var _showPanel = backstage.showPanel;
backstage.showPanel = function(){
	jQuery("#backstageArea,#backstage,#backstageButton").css({position:"absolute"});	
	_showPanel();	
}

var _hidePanel = backstage.hidePanel;
backstage.hidePanel = function(e){
	jQuery("#backstageArea,#backstage,#backstageButton").css({position:"fixed"});	
	_hidePanel();
}

var timeout,mouseover;
//keep a record of when the user has their mouse over the backstage to prevent annoying them
jQuery("#backstageArea").mouseover(function(e){mouseover = true;})
.mouseout(function(e){mouseover=false;});

//setup a scroll event to give backstage certain behaviours
jQuery(window).scroll(function(e){
	if(window.scrollY > 0){ //if scrolling away from the top prepare to hide backstage after given time
		window.clearTimeout(timeout);
		timeout = window.setTimeout(function(){
			if(!backstage.isPanelVisible() && !mouseover)backstage.hide();
			actionInProgress = false;
		},1000);
	}
	else if(window.scrollY === 0){ //if at top of screen show the backstage after given time
		window.clearTimeout(timeout);
		timeout = window.setTimeout(function(){
			if(!backstage.isVisible())backstage.show();
			actionInProgress = false;
		},400);
	}
});

})(jQuery);
//}}}
