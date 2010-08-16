/***
|''Name''|ToggleTiddlerPrivacyPlugin|
|''Version''|0.5.2|
|''Status''|@@beta@@|
|''Description''|Allows you to set the privacy of new tiddlers and external tiddlers within an EditTemplate|
|''Requires''|TiddlySpaceConfig|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/raw/master/src/plugins/ToggleTiddlerPrivacyPlugin.js|
!Notes
When used in conjunction with TiddlySpaceTiddlerIconsPlugin changing the privacy setting will also interact with any privacy icons.
!Code
***/
//{{{
(function($) {

config.macros.setPrivacy = {
	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var el = $(story.findContainingTiddler(place));
		var container = $("<div />").addClass("privacySettings").appendTo(place);
		var currentSpace = config.extensions.tiddlyspace.currentSpace.name;
		var currentWorkspace = tiddler ? tiddler.fields["server.workspace"] : false;
		var currentBag = tiddler.fields["server.bag"] || "";
		var isNewTiddler = el.hasClass("missing") || !currentWorkspace; // XXX: is this reliable?
		var privateWorkspace = "bags/%0_private".format([currentSpace]);
		var publicWorkspace = "bags/%0_public".format([currentSpace]);
		var isExternal = currentBag.indexOf("/%0_".format([currentSpace])) > -1 ||
			currentBag == "tiddlyspace";
		var originButton = $(".originButton", el)[0];
		var iconOptions = { labelOptions: { includeLabel: "true" } };
		if(isNewTiddler || isExternal) {
			var rbtn = $('<input type="radio" />').attr("name", tiddler.title);
			rbtn.clone().val("private").addClass("isPrivate").
				attr("checked", "true").appendTo(container);
			$("<label />").text("private").appendTo(container); // TODO: i18n
			rbtn.clone().val("public").addClass("isPublic").appendTo(container);
			$("<label />").text("public").appendTo(container); // TODO: i18n
			var refreshIcon = function(type) {
				var originMacro = config.macros.originMacro;
				if(originButton && originMacro) {
					$(originButton).empty();
					originMacro.showPrivacyRoundel(tiddler, type, originButton, null, iconOptions);
				}
			};
			$("[type=radio]", container).click(function() {
				var btn = $(this);
				var saveField = $("[edit=server.workspace]", el);
				var name = el.attr("name");
				tiddler.fields["server.page.revision"] = "false";
				if(btn.hasClass("isPrivate")) { // private button clicked.
					el.addClass("isPrivate").removeClass("isPublic");
					saveField.val(privateWorkspace);
					tiddler.fields["server.workspace"] = privateWorkspace; // for external tiddlers
					refreshIcon("private");
				} else {
					el.addClass("isPublic").removeClass("isPrivate");
					saveField.val(publicWorkspace);
					tiddler.fields["server.workspace"] = publicWorkspace;
					refreshIcon("public");
				}
			});
			refreshIcon("private");
		}
	}
};

})(jQuery);
//}}}
