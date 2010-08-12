/***
|''Name''|ToggleTiddlerPrivacyPlugin|
|''Version''|0.5.1|
|''Status''|beta|
|''Description''|Allows you to set the privacy of new tiddlers and external tiddlers within an EditTemplate|
|''Requires''|TiddlySpaceConfig|
|''Source''||
!Notes
When used in conjunction with TiddlySpaceTiddlerIconsPlugin changing the privacy setting will also interact with any privacy icons.
!Code
***/
//{{{
(function($) {
var ns = config.extensions.tiddlyspace;
var privacyMacro = config.macros.setPrivacy = {
	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var el = $(story.findContainingTiddler(place));
		var container = $("<div />").addClass("privacySettings").appendTo(place)[0];
		var currentSpace = ns.currentSpace.name;
		var currentWorkspace = tiddler ? tiddler.fields['server.workspace'] : false;
		var currentBag = tiddler.fields['server.bag'] || "";
		var isNewTiddler = $(el).hasClass("missing") || !currentWorkspace; // is this reliable?
		var privateWorkspace = "bags/%0_private".format([currentSpace]);
		var publicWorkspace = "bags/%0_public".format([currentSpace]);
		var isExternal = currentBag.indexOf("/%0_".format([currentSpace])) >  -1 || currentBag == "tiddlyspace";
		var originButton = $(".originButton", el)[0];
		var iconOptions = {labelOptions: {includeLabel: "true"}};
		if(isNewTiddler || isExternal) {
			var radioName = tiddler.title;
			$("<input type='radio' name='%0' value='private' checked='true' class='isPrivate'/><label>private</label>".format([radioName])).appendTo(container);
			$("<input type='radio' name='%0' value='public' class='isPublic'/><label>public</label>".format([radioName])).appendTo(container);
			var radios = $(".isPrivate[type=radio], .isPublic[type=radio]", container);
			var refreshIcon = function(type) {
				var originMacro = config.macros.originMacro;
				if(originButton && originMacro) {
					$(originButton).empty();
					originMacro.showPrivacyRoundel(tiddler, type, originButton, null, iconOptions);
				}
			};
			radios.click(function() {
				var btn = $(this);
				var saveField = $("[edit=server.workspace]", el);
				var name = el.attr("name");
				tiddler.fields['server.page.revision'] = 'false';
				if(btn.hasClass("isPrivate")) { // private button clicked.
					el.addClass("isPrivate").removeClass("isPublic");
					saveField.val(privateWorkspace);
					tiddler.fields['server.workspace'] = privateWorkspace; // for external tiddlers
					refreshIcon("private");
				} else {
					el.addClass("isPublic").removeClass("isPrivate");
					saveField.val(publicWorkspace);
					tiddler.fields['server.workspace'] = publicWorkspace;
					refreshIcon("public");
				}
			});
			refreshIcon("private");
		}
	}
};
})(jQuery);
//}}}
