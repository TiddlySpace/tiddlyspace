/***
|''Name''|TiddlySpaceTiddlerIconsPlugin|
|''Version''|0.8.10|
|''Status''|@@beta@@|
|''Author''|Jon Robson|
|''Description''|Provides ability to render SiteIcons and icons that correspond to the home location of given tiddlers|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/raw/master/src/plugins/TiddlySpaceTiddlerIconsPlugin.js|
|''Requires''|TiddlySpaceConfig BinaryTiddlersPlugin ImageMacroPlugin TiddlySpacePublishingCommands|
!Notes
{{{<<tiddlerOrigin>>}}} shows the origin of the tiddler it is being run on.
In TiddlySpace terms this means it will determine whether the tiddler is external, public or private.
Where private it will analyse whether a public version exists and distinguish between the different scenarios.
If a tiddler is external, the SiteIcon of that external space will be shown

!Parameters
width / height : define a width or height of the outputted icon
label: if label parameter is set to yes, a label will accompany the icon.
!Code
***/
//{{{
(function($) {

if(!config.macros.image) {
	throw "Missing dependency: ImageMacroPlugin";
}

var imageMacro = config.macros.image;
var tiddlyspace = config.extensions.tiddlyspace;
var tweb = config.extensions.tiddlyweb;
var cmds = config.commands;
var cmd = cmds.publishTiddler;
tiddlyspace.resolveSpaceName = function(value) {
	var endsWith = config.extensions.BinaryTiddlersPlugin.endsWith;
	if(value) {
		value = value.indexOf("bags/") === 0 ? value.substr(5) : value;
		value = value.indexOf("recipes/") === 0 ? value.substr(8) : value;
		if(value.indexOf("@") === 0) {
			value = value.substr(1);
		}
		if(endsWith(value, "_public")) {
			value = value.substr(0, value.length - 7);
		} else if(endsWith(value, "_private")) {
			value = value.substr(0, value.length - 8);
		}
		value = value.toLowerCase();
	}
	return value;
};

tiddlyspace.renderAvatar = function(place, value, options) {
	options = options ? options : {};
	options.labelOptions = options.labelOptions ? options.labelOptions : { include: false, height: 48, width: 48 };
	options.imageOptions = options.imageOptions ? options.imageOptions : {};
	options.imageOptions.altImage = "/bags/common/tiddlers/defaultUserIcon";
	var container = $('<div class="siteIcon" />').appendTo(place);
	value = tiddlyspace.resolveSpaceName(value);

	tweb.getStatus(function(status) {
		var link, noLabel;
		if(!value || value == config.views.wikified.defaultModifier ||
			value == config.views.wikified.shadowModifier) {
			var icon = config.views.wikified.shadowModifier == value ? "shadowIcon" : "missingIcon";
			if(store.tiddlerExists(icon)) {
				imageMacro.renderImage(container, icon, options.imageOptions);
			} else {
				noLabel = true;
			}
		} else {
			var spaceURI;
			if(value != tiddlyspace.currentSpace.name) {
				spaceURI = options.notSpace ? tiddlyspace.getHost(status.server_host) :
					tiddlyspace.getHost(status.server_host, value);
			}
			link = spaceURI ? $("<a />").attr("href", spaceURI) : $("<span />");
			link.text(value);

			var imageOptions = options.imageOptions;
			if(options.spaceLink && !imageOptions.link) {
				imageOptions.link = spaceURI;
			}
			var avatar = options.notSpace ? false : value;
			var uri = tiddlyspace.getAvatar(status.server_host, avatar);
			imageMacro.renderImage(container, uri, options.imageOptions);
			if(!value) {
				value = "tiddlyspace";
			}
		}
		if(!noLabel && options.labelOptions.include) {
			var prefix = $("<span />").text(options.labelOptions.prefix || "")[0];
			var suffix = $("<span />").text(options.labelOptions.suffix || "")[0];
			$('<div class="label" />').append(prefix).append(link).
				append(suffix).appendTo(container);
		}
	});
	if(value) {
		var prefix = options.labelOptions.prefix || "";
		var suffix = options.labelOptions.suffix || "";
		var label = "%0%1%2".format(prefix, value, suffix);
		$(container).attr("title", label);
	}
};

var originMacro = config.macros.tiddlerOrigin = {
	locale: {
		"shadow": "shadow tiddler",
		"missing": "missing tiddler",
		"private": "private",
		"unknown": "unknown state",
		"public": "public",
		"unsyncedPrivate": "unsynced and private",
		"unsyncedPublic": "unsynced and public",
		externalPrefix: "from ",
		externalBagSuffix: " bag",
		externalSuffix: " space",
		publishPrivateDeletePrivate: "Are you sure you want to make this tiddler public?",
		moveToPrivate: "Are you sure you want to make this tiddler private? Only members will be able to see it.",
		pleaseWait: "please wait..",
		keepPublic: "keep public",
		cannotPublishDirtyTiddler: "The current tiddler is unsaved so cannot be published. Please save the tiddler first.",
		keepPrivate: "keep private",
		makePublic: "make public",
		makePrivate: "make private"
	},
	handler: function(place, macroName, params,wikifier, paramString, tiddler){
		var adaptor = tiddler.getAdaptor();
		var btn = $("<div />").addClass("originButton").attr("params", paramString).
			attr("refresh", "macro").attr("macroName", macroName).appendTo(place)[0];
		$(btn).data("tiddler", tiddler);
		originMacro.refresh(btn);
	},
	refresh: function(btn) {
		$(btn).empty();
		var paramString = $(btn).attr("params");
		var tiddler = $(btn).data("tiddler");
		var options = originMacro.getOptions(paramString);
		var type = tiddlyspace.getTiddlerStatusType(tiddler);
		originMacro.renderIcon(tiddler, type, btn, options);
	},
	getOptions: function(paramString) {
		paramString = "%0 label:no width:48 height:48 spaceLink:yes preserveAspectRatio:yes".format(paramString);
		var parsedParams = paramString.parseParams("name");
		var params = parsedParams[0].name;
		var options = {
			labelOptions: originMacro._getLabelOptions(parsedParams),
			imageOptions: imageMacro.getArguments(paramString, []),
			noclick: parsedParams[0].interactive &&
				parsedParams[0].interactive[0] == "no" ? true : false
		};
		if(!options.noclick) {
			var spaceLink = parsedParams[0].spaceLink;
			options.spaceLink = spaceLink && spaceLink[0] == "no" ? false : true;
		} else {
			options.spaceLink = false;
		}
		return options;
	},
	_getLabelOptions: function(parsedParams) {
		parsedParams = parsedParams[0];
		var includeLabel = !parsedParams.label || ( parsedParams.label && parsedParams.label[0] == "yes" );
		var prefix = parsedParams.labelPrefix ? parsedParams.labelPrefix[0] : false;
		var suffix = parsedParams.labelSuffix ? parsedParams.labelSuffix[0] : false;
		return { include: includeLabel, suffix: suffix, prefix: prefix };
	},
	_isSpace: function(value) {
		value = value ? value : "";
		var endsWith = config.extensions.BinaryTiddlersPlugin.endsWith;
		if(endsWith(value, "_private") || endsWith(value, "_public")) {
			return true;
		} else {
			return false;
		}
	},
	renderIcon: function(tiddler, type, button, options) {
		var locale = originMacro.locale;
		originMacro.annotateTiddler(button, type);
		if(type != "external") {
			originMacro.showPrivacyRoundel(tiddler, type, button,
				options);
		} else {
			var prefix = options.labelOptions.prefix, suffix = options.labelOptions.suffix;
			var space = tiddler.fields["server.bag"];
			options.notSpace = !originMacro._isSpace(space);
			options.labelOptions.prefix = prefix ? prefix : locale.externalPrefix;
			options.labelOptions.suffix = suffix ? suffix : (options.notSpace ? locale.externalBagSuffix : locale.externalSuffix);

			tiddlyspace.renderAvatar(button, space, options);
		}
	},
	showPrivacyRoundel: function(thisTiddler, privacyType, button, options) {
		// there is a public tiddler as well as the current tiddler!
		// TODO: not this is not enough.. we also need to check if the public tiddler is the same as..
		// .. the private tiddler to determine whether this is a draft
		// use of hashes would be useful here.
		$(button).empty();
		var icon = "%0Icon".format(privacyType);
		if(privacyType.indexOf("unsynced") === 0 && !store.tiddlerExists(icon)) {
			icon = "unsyncedIcon";
		}
		if(privacyType == "shadow") {
			if(!store.tiddlerExists(icon)) {
				icon = "bags/tiddlyspace/tiddlers/SiteIcon";
			}
		}
		if(privacyType == "missing" && !store.tiddlerExists(icon)) {
			return; // the user is not making use of the missingIcon
		} else {
			imageMacro.renderImage(button, icon, options.imageOptions);
			originMacro.showLabel(button, privacyType, options.labelOptions);
			var cmd = originMacro.iconCommands[privacyType];
			if(cmd && thisTiddler && !options.noclick) {
				$(button).click(function(ev) {
					cmd(ev, thisTiddler);
				});
			}
		}
	},
	annotateTiddler: function(place, type) {
		var tidEl = $(story.findContainingTiddler(place));
		tidEl.
			removeClass("private public external privateAndPublic privateNotPublic shadow").
			addClass(type);
	},
	showLabel: function(button, type, options) {
		var locale = originMacro.locale;
		var label = options.label ? options.label : locale[type];
		label = label ? label : locale.unknown;
		if(options && options.include) {
			$('<div class="roundelLabel" />').html(label).appendTo(button);
		}
		$(button).attr("title", label);
	},
	confirm: function(ev, msg, onYes, options) {
		options = options ? options : {};
		onYes = onYes ? onYes : function(ev) {};
		var btn = $(".originButton", $(ev.target).parents())[0];
		var popup = Popup.create(btn);
		$(popup).addClass("confirmationPopup");
		$("<div />").addClass("message").text(msg).appendTo(popup);
		$("<button />").addClass("button").text(options.yesLabel || "yes").appendTo(popup).click(onYes);
		$("<button />").addClass("button").text(options.noLabel || "no").click(function(ev) {
			Popup.remove();
		}).appendTo(popup);
		Popup.show();
		ev.stopPropagation();
		return false;
	},
	alert: function(ev, msg) {
		var popup = Popup.create(ev.target);
		$(popup).addClass("confirmationPopup alert");
		$("<div />").addClass("message").text(msg).appendTo(popup);
		Popup.show();
		ev.stopPropagation();
	},
	reportDirty: function(el) {
		originMacro.alert(el, originMacro.locale.cannotPublishDirtyTiddler);
	},
	iconCommands: {
		"public": function(ev, tiddler) {
			if(!readOnly) {
				var locale = originMacro.locale;
				var msg = locale.moveToPrivate;
				if(story.isDirty(tiddler.title)) {
					originMacro.reportDirty(ev);
				} else {
					originMacro.confirm(ev, msg, function(ev) {
						var target = $(ev.target);
						var onComplete = function(info) {};
						var privateBag = cmd.toggleBag(tiddler, "private");
						cmd.moveTiddler(tiddler, {
							title: tiddler.title,
							fields: { "server.bag": privateBag }
						}, onComplete);
					}, { yesLabel: locale.makePrivate, noLabel: locale.keepPublic });
				}
			}
		},
		"private": function(ev, tiddler) {
			if(!readOnly) {
				var locale = originMacro.locale;
				var adaptor = tiddler.getAdaptor();
				var publishTo = tiddler.fields["publish.name"] || tiddler.title;
				var workspace = "bags/%0".format(tiddler.fields["server.bag"]);
				tiddler.fields["server.workspace"] = workspace;
				var publicBag = cmd.toggleBag(tiddler, "public");
				var msg;
				msg = locale.publishPrivateDeletePrivate;
				var title = tiddler.title;
				var newTitle = publishTo || tiddler.title;
				tiddler.fields["server.page.revision"] = "false";
				store.addTiddler(tiddler);
				if(story.isDirty(tiddler.title)) {
					originMacro.reportDirty(ev);
				} else {
					originMacro.confirm(ev, msg, function(ev) {
						var onComplete = function(info) {};
						cmd.moveTiddler(tiddler, {
							title: newTitle,
							fields: { "server.bag": publicBag }
						}, onComplete);
					}, { yesLabel: locale.makePublic, noLabel: locale.keepPrivate });
				}
			}
		}
	}
};

})(jQuery);
//}}}
