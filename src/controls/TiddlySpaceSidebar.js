/***
|''Requires''|TiddlySpaceConfig|
***/
//{{{
(function($) {

var plugin = config.extensions.TiddlySpaceSidebar = {
	btnLabel: "new %0 tiddler",
	btnTemplate: "<<newTiddler fields:\"'server.workspace':'recipes/%0_%1'\" label:'%2'>>"
};

var shadows = config.shadowTiddlers;
shadows.SideBarOptions = shadows.SideBarOptions.replace("<<saveChanges>>",
	"<<tiddler TiddlySpaceControls>><<saveChanges>>");

shadows.TiddlySpaceControls = $.map(["public", "private"], function(item, i) {
	var label = plugin.btnLabel.format([item]); // XXX: i18n?!
	var space = config.extensions.TiddlyWeb.tiddlyspace.currentSpace;
	return plugin.btnTemplate.format([space, item, label]);
}).join("");

})(jQuery);
//}}}
