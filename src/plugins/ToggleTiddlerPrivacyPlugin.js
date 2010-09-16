/***
|''Name''|ToggleTiddlerPrivacyPlugin|
|''Version''|0.6.0|
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

var macro = config.macros.setPrivacy = {
	DEFAULT_STATE: "private",

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		if(readOnly) {
			return;
		}
		var el = $(story.findContainingTiddler(place));
		var args = paramString.parseParams("name", null, true, false, true)[0];
		var container = $("<div />").addClass("privacySettings").appendTo(place)[0];
		var currentSpace = tiddlyspace.currentSpace.name;
		var currentBag = tiddler ? tiddler.fields["server.bag"] : false;
		var isNewTiddler = el.hasClass("missing") || !currentBag; // XXX: is this reliable?
		if(isNewTiddler || this.isExternal(tiddler)) {
			var defaultValue = args.defaultValue;
			defaultValue = defaultValue ? "%0_%1".format([currentSpace, defaultValue[0]]) : false;
			var options = config.macros.tiddlerOrigin ?
				config.macros.tiddlerOrigin.getOptions(params, paramString) : false;
			this.createRoundel(container, tiddler, currentSpace, defaultValue, options);
		}
	},

	isExternal: function(tiddler) {
		var bag = tiddler.fields["server.bag"] || "";
		var prefix = "%0_".format([tiddlyspace.currentSpace.name]);
		return bag.indexOf(prefix) != 0 || bag == "tiddlyspace";
	},
	setBag: function(tiddlerEl, newBag, options) {
		var title = $(tiddlerEl).attr("tiddler");
		var tiddler = store.getTiddler(title);
		var originButton = $(".originButton", tiddlerEl)[0];
		var refreshIcon = function(type) {
			var originMacro = config.macros.tiddlerOrigin;
			if(originButton && originMacro) {
				originMacro.showPrivacyRoundel(tiddler, type, originButton, null, options);
			}
		};

		var saveBagField = $("[edit=server.bag]", tiddlerEl);
		if(saveBagField.length === 0) {
			story.addCustomFields(tiddlerEl, "server.bag: %0".format([newBag]));
		} else {
			saveBagField.val(newBag);
		}
		var saveWorkspaceField = $("[edit=server.workspace]", tiddlerEl);
		var newWorkspace = "bags/%0".format([newBag]);
		saveWorkspaceField.val(newWorkspace);
		if(tiddler) {
			tiddler.fields["server.bag"] = newBag;
			tiddler.fields["server.workspace"] = newWorkspace; // for external tiddlers
		}
		var rPrivate = $("input[type=radio].isPrivate", tiddlerEl);
		var rPublic = $("input[type=radio].isPublic", tiddlerEl);
		if(newBag.indexOf("_public") > -1) {
			rPublic.attr("checked", true);
			rPrivate.attr("checked", false);
			status = "public";
		} else {
			rPrivate.attr("checked", true);
			rPublic.attr("checked", false); // explicitly do this for ie
			status = "private";
		}
		refreshIcon(status);
	},
	createRoundel: function(container, tiddler, currentSpace, defaultValue, options) {
		var privateBag = "%0_private".format([currentSpace]);
		var publicBag = "%0_public".format([currentSpace]);
		var rbtn = $("<input />").attr("type", "radio").attr("name", tiddler.title);
		var rPrivate = rbtn.clone().val("private").addClass("isPrivate").appendTo(container);
		$("<label />").text("private").appendTo(container); // TODO: i18n
		var rPublic = rbtn.clone().val("public").addClass("isPublic").appendTo(container);
		$("<label />").text("public").appendTo(container); // TODO: i18n
		var status = macro.DEFAULT_STATE;
		var el = story.findContainingTiddler(container);
		$("[type=radio]", container).click(function(ev) {
			var btn = $(ev.target);
			tiddler.fields["server.page.revision"] = "false";
			if(btn.hasClass("isPrivate")) { // private button clicked.
				$(el).addClass("isPrivate").removeClass("isPublic");
				macro.setBag(el, privateBag, options);
			} else {
				$(el).addClass("isPublic").removeClass("isPrivate");
				macro.setBag(el, publicBag, options);
			}
		});
		if(!defaultValue) {
			defaultValue = macro.DEFAULT_STATE == "public" ? publicBag : privateBag;
		}
		// TODO: replace with a hijack of displayTiddler?
		window.setTimeout(function() {
			macro.setBag(el, defaultValue, options);
		}, 200); // not ideal - but need to wait till finished displayTiddler for brand new tiddlers
	}
};

})(jQuery);
//}}}
