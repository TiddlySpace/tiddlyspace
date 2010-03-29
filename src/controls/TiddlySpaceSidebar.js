/***
|''Requires''|TiddlyWebConfig|
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

var space = config.defaultCustomFields["server.workspace"].
	split("recipes/")[1]. // XXX: brittle?
	split("_")[0]; // XXX: brittle (space name must not contain underscores)

shadows.TiddlySpaceControls = $.map(["public", "private"], function(item, i) {
	var label = plugin.btnLabel.format([item]); // XXX: i18n?!
	return plugin.btnTemplate.format([space, item, label]);
}).join("");

})(jQuery);
//}}}
