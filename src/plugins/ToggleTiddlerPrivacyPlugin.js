/***
|''Name''|ToggleTiddlerPrivacyPlugin|
|''Version''|0.7.0|
|''Status''|@@beta@@|
|''Description''|Allows you to set the privacy of new tiddlers and external tiddlers within an EditTemplate, and allows you to set a default privacy setting|
|''CoreVersion''|2.6.1|
|''Requires''|TiddlySpaceConfig|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/raw/master/src/plugins/ToggleTiddlerPrivacyPlugin.js|
!Notes
When used in conjunction with TiddlySpaceTiddlerIconsPlugin changing the privacy setting will also interact with any privacy icons.

Currently use of
{{{<<setPrivacy defaultValue:public>>}}} is in conflict with {{{<<newTiddler fields:"server.workspace:x_private">>}}}

There is an option, found in the tweak tab of the backstage, called txtPrivacyMode. Set this to either ''public'' or ''private'' depending on your security preference. If you choose not to set it then it will default to ''public''.
!Params
defaultValue:[private|public]
Allows you to set the default privacy value (Default is private)

!Code
***/
//{{{
(function($) {

var tiddlyspace = config.extensions.tiddlyspace;
var macro = config.macros.setPrivacy = {
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
		var status = tiddlyspace.getTiddlerStatusType(tiddler);
		var customFields = el.attr("tiddlyfields");
		customFields = customFields ? customFields.decodeHashMap() : {};
		if(isNewTiddler || !["public", "private", "unsyncedPrivate", "unsyncedPublic"].contains(status)) {
			var defaultValue = "public";
			if(args.defaultValue) {
				defaultValue = args.defaultValue[0].toLowerCase();
			} else {
				defaultValue = config.options.chkPrivateMode ? "private" : "public";
			}
			defaultValue = defaultValue ?
				"%0_%1".format(currentSpace, defaultValue) : customFields["server.bag"];
			var options = config.macros.tiddlerOrigin ?
				config.macros.tiddlerOrigin.getOptions(paramString) : {};
			this.createRoundel(container, tiddler, currentSpace, defaultValue, options);
		}
	},
	updateEditFields: function(tiddlerEl, bag) {
		var saveBagField = $('[edit="server.bag"]', tiddlerEl);
		var saveWorkspaceField = $('[edit="server.workspace"]', tiddlerEl);
		var input = $("<input />").attr("type", "hidden");
		if(saveBagField.length === 0) {
			input.clone().attr("edit", "server.bag").val(bag).appendTo(tiddlerEl);
		} else {
			saveBagField.val(bag);
		}
		$(tiddlerEl).attr("tiddlyFields", ""); // reset to prevent side effects
		var workspace = "bags/" + bag;
		if(saveWorkspaceField.length === 0) {
			input.clone().attr("edit", "server.workspace").val(workspace).appendTo(tiddlerEl);
		} else {
			saveWorkspaceField.val(workspace);
		}
	},
	setBag: function(tiddlerEl, newBag, options) {
		var title = $(tiddlerEl).attr("tiddler");
		var tiddler = store.getTiddler(title);
		var originButton = $(".originButton", tiddlerEl)[0];
		var refreshIcon = function(type) {
			var originMacro = config.macros.tiddlerOrigin;
			if(originButton && originMacro) {
				options.noclick = true;
				originMacro.showPrivacyRoundel(tiddler, type, originButton, options);
			}
		};
		macro.updateEditFields(tiddlerEl, newBag);
		var newWorkspace = "bags/" + newBag;
		if(tiddler) {
			tiddler.fields["server.bag"] = newBag;
			tiddler.fields["server.workspace"] = newWorkspace; // for external tiddlers
		}
		var rPrivate = $("input[type=radio].isPrivate", tiddlerEl);
		var rPublic = $("input[type=radio].isPublic", tiddlerEl);
		if(newBag.indexOf("_public") > -1) {
			rPrivate.attr("checked", false);
			rPublic.attr("checked", true);
			status = "public";
		} else {
			rPublic.attr("checked", false); // explicitly do this for ie
			rPrivate.attr("checked", true);
			status = "private";
		}
		refreshIcon(status);
	},
	createRoundel: function(container, tiddler, currentSpace, defaultValue, options) {
		var privateBag = "%0_private".format(currentSpace);
		var publicBag = "%0_public".format(currentSpace);
		var rbtn = $("<input />").attr("type", "radio").attr("name", tiddler.title);
		var rPrivate = rbtn.clone().val("private").addClass("isPrivate").appendTo(container);
		$("<label />").text("private").appendTo(container); // TODO: i18n
		var rPublic = rbtn.clone().val("public").addClass("isPublic").appendTo(container);
		$("<label />").text("public").appendTo(container); // TODO: i18n
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
		window.setTimeout(function() {
			macro.setBag(el, defaultValue, options);
		}, 100);
		// annoyingly this is needed as customFields are added to end of EditTemplate so are not present yet
		// and don't seem to respect any existing customFields.
	}
};

})(jQuery);
//}}}
