/***
|''Name''|ToggleTiddlerPrivacyPlugin|
|''Version''|0.7.1|
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

	var tiddlyspace = config.extensions.tiddlyspace,
		macro;
	macro = config.macros.setPrivacy = {
		handler: function(place, macroName, params, wikifier, paramString, tiddler) {
			if(readOnly) {
				return;
			}
			var el = $(story.findContainingTiddler(place)),
				args = paramString.parseParams("name",
					null, true, false, true)[0],
				container = $("<div />").
					addClass("privacySettings").
					appendTo(place)[0],
				currentSpace = tiddlyspace.currentSpace.name,
				currentBag = tiddler ? tiddler.fields["server.bag"] : false,
				// XXX: is the following reliable?
				isNewTiddler = el.hasClass("missing") || !currentBag,
				tiddlerStatus = tiddlyspace.getTiddlerStatusType(tiddler),
				customFields = el.attr("tiddlyfields"),
				defaultValue = "public",
				options = config.macros.tiddlerOrigin ?
						config.macros.tiddlerOrigin.getOptions(paramString) :
						{};
			customFields = customFields ? customFields.decodeHashMap() : {};
			if(isNewTiddler || !["public", "private", "unsyncedPrivate",
					"unsyncedPublic"].contains(tiddlerStatus)) {
				if(args.defaultValue) {
					defaultValue = args.defaultValue[0].toLowerCase();
				} else {
					defaultValue = config.options.chkPrivateMode ?
							"private" : "public";
				}
				defaultValue = defaultValue ?
						"%0_%1".format(currentSpace, defaultValue) :
						customFields["server.bag"];
				this.createRoundel(container, tiddler, currentSpace,
						defaultValue, options);
			}
		},
		updateEditFields: function(tiddlerEl, bag) {
			var saveBagField = $('[edit="server.bag"]', tiddlerEl),
				saveWorkspaceField = $('[edit="server.workspace"]', tiddlerEl),
				input = $("<input />").attr("type", "hidden"),
				workspace = "bags/" + bag;
			if(saveBagField.length === 0) {
				input.clone().attr("edit", "server.bag").val(bag).
					appendTo(tiddlerEl);
			} else {
				saveBagField.val(bag);
			}
			// reset to prevent side effects
			$(tiddlerEl).attr("tiddlyFields", "");
			if(saveWorkspaceField.length === 0) {
				input.clone().attr("edit", "server.workspace").
					val(workspace).appendTo(tiddlerEl);
			} else {
				saveWorkspaceField.val(workspace);
			}
		},
		setBag: function(tiddlerEl, newBag, options) {
			var bagStatus,
				title = $(tiddlerEl).attr("tiddler"),
				tiddler = store.getTiddler(title),
				originButton = $(".originButton", tiddlerEl)[0],
				refreshIcon,
				newWorkspace = "bags/" + newBag,
				rPrivate = $("input[type=radio].isPrivate", tiddlerEl),
				rPublic = $("input[type=radio].isPublic", tiddlerEl);
			refreshIcon = function(type) {
				var originMacro = config.macros.tiddlerOrigin;
				if(originButton && originMacro) {
					options.noclick = true;
					originMacro.showPrivacyRoundel(tiddler, type,
							originButton, options);
				}
			};
			macro.updateEditFields(tiddlerEl, newBag);
			if(tiddler) {
				tiddler.fields["server.bag"] = newBag;
				// for external tiddlers
				tiddler.fields["server.workspace"] = newWorkspace;
			}
			if(newBag.indexOf("_public") > -1) {
				rPrivate.attr("checked", false);
				rPublic.attr("checked", true);
				bagStatus = "public";
			} else {
				rPublic.attr("checked", false); // explicitly do this for ie
				rPrivate.attr("checked", true);
				bagStatus = "private";
			}
			refreshIcon(bagStatus);
		},
		createRoundel: function(container, tiddler, currentSpace,
							   defaultValue, options) {
			var privateBag = "%0_private".format(currentSpace),
				publicBag = "%0_public".format(currentSpace),
				rbtn = $("<input />").attr("type", "radio").
					attr("name", tiddler.title),
				el = story.findContainingTiddler(container);
			rbtn.clone().val("private").addClass("isPrivate").
				appendTo(container);
			$("<label />").text("private").appendTo(container); // TODO: i18n
			rbtn.clone().val("public").addClass("isPublic")
				.appendTo(container);
			$("<label />").text("public").appendTo(container); // TODO: i18n
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

}(jQuery));
//}}}
