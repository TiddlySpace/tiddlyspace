/***
|''Name''|ToggleTiddlerPrivacyPlugin|
|''Version''|0.5.6|
|''Status''|@@beta@@|
|''Description''|Allows you to set the privacy of new tiddlers and external tiddlers within an EditTemplate|
|''Requires''|TiddlySpaceConfig|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/raw/master/src/plugins/ToggleTiddlerPrivacyPlugin.js|
!Notes
When used in conjunction with TiddlySpaceTiddlerIconsPlugin changing the privacy setting will also interact with any privacy icons.

Currently use of
<<setPrivacy defaultValue:public>> is in conflict with <<newTiddler fields:"server.workspace:x_private">>
!Params
defaultValue:[private|public]
Allows you to set the default privacy value (Default is private)

!Code
***/
//{{{
(function($) {

var tiddlyspace = config.extensions.tiddlyspace;

config.macros.setPrivacy = {
	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var el = $(story.findContainingTiddler(place));
		var args = paramString.parseParams("name", null, true, false, true)[0];
		var container = $("<div />").addClass("privacySettings").appendTo(place)[0];
		var currentSpace = tiddlyspace.currentSpace.name;
		var currentWorkspace = tiddler ? tiddler.fields["server.workspace"] : false;
		var isNewTiddler = el.hasClass("missing") || !currentWorkspace; // XXX: is this reliable?
		if(isNewTiddler || this.isExternal(tiddler)) {
			var userDefault = args.defaultValue;
			userDefault = userDefault ? "bags/%0_%1".format([currentSpace, userDefault[0]]) : false;
			var defaultValue = currentWorkspace || userDefault || false;
			this.createRoundel(container, tiddler, currentSpace, defaultValue);
		}
	},
	isExternal: function(tiddler) {
		var currentSpace = tiddlyspace.currentSpace.name;
		var currentBag = tiddler.fields["server.bag"] || "";
		var startsWith = "%0_".format([currentSpace]);
		return  currentBag.indexOf(startsWith) != 0 ||
			currentBag == "tiddlyspace";
	},
	createRoundel: function(container, tiddler, currentSpace, defaultValue) {
		var iconOptions = { labelOptions: { includeLabel: "true" } };
		var el = $(story.findContainingTiddler(container));
		var originButton = $(".originButton", el)[0];
		var privateWorkspace = "bags/%0_private".format([currentSpace]);
		var publicWorkspace = "bags/%0_public".format([currentSpace]);
		var rbtn = $("<input />").attr("type", "radio").attr("name", tiddler.title);
		var rPrivate = rbtn.clone().val("private").addClass("isPrivate").appendTo(container);
		$("<label />").text("private").appendTo(container); // TODO: i18n
		var rPublic = rbtn.clone().val("public").addClass("isPublic").appendTo(container);
		$("<label />").text("public").appendTo(container); // TODO: i18n
		var status = "private";

		var refreshIcon = function(type) {
			var originMacro = config.macros.tiddlerOrigin;
			if(originButton && originMacro) {
				$(originButton).empty();
				originMacro.showPrivacyRoundel(tiddler, type, originButton, null, iconOptions);
			}
		};
		var setWorkspace = function(workspace) {
			var saveField = $("[edit=server.workspace]", el);
			if(!workspace) {
				workspace = saveField.val();
			}
			if(workspace) {
				saveField.val(workspace);
				tiddler.fields["server.workspace"] = workspace; // for external tiddlers
				if(workspace.indexOf("_public") > -1) {
					rPublic.attr("checked", true);
					rPrivate.attr("checked", false);
					status = "public";
				} else {
					rPrivate.attr("checked", true);
					rPublic.attr("checked", false); // explicitly do this for ie
					status = "private";
				}
				refreshIcon(status);
			}
		};

		$("[type=radio]", container).click(function() {
			var btn = $(this);
			tiddler.fields["server.page.revision"] = "false";
			if(btn.hasClass("isPrivate")) { // private button clicked.
				el.addClass("isPrivate").removeClass("isPublic");
				setWorkspace(privateWorkspace);
			} else {
				el.addClass("isPublic").removeClass("isPrivate");
				setWorkspace(publicWorkspace);
			}
		});
		// TODO: replace with a hijack of displayTiddler?
		window.setTimeout(function() {
			setWorkspace(defaultValue);
		}, 200); // not ideal - but need to wait till finished displayTiddler for brand new tiddlers
	}
};

})(jQuery);
//}}}
