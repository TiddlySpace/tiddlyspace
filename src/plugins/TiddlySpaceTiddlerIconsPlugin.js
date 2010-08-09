/***
|''Name''|TiddlySpaceTiddlerIconsPlugin|
|''Version''|0.22|
|''Status''|beta|
|''Description''|Provides ability to render SiteIcons and icons that correspond to the home location of given tiddlers|
|''Requires''|TiddlySpaceConfig BinaryTiddlersPlugin ImageMacroPlugin|
|''Source''||
!Notes
Provides an additional SiteIcon view for use with view macro
{{{<<view modifier SiteIcon>>}}}
will show the SiteIcon located in the space with the same name as modifier.
It also works if the attribute given ends with _private or _public (so {{{<<view server.bag SiteIcon>>}}} is usable).

{{{<<tiddlerOrigin>>}}} shows the origin of the tiddler it is being run on.
In TiddlySpace terms this means it will determine whether the tiddler is external, public or private.
Where private it will analyse whether a public version exists and distinguish between the different scenarios.
If a tiddler is external, the SiteIcon of that external space will be shown

When a ViewTemplate contains an element with class concertina, clicking on the icon outputted by the tiddlerOrigin macro
will reveal more detailed information on what the icon means.
!Parameters
both take the same parameters
width / height : define a width or height of the outputted icon
label: if label parameter is set to yes, a label will accompany the icon.

!!additional view parameters
labelPrefix / labelSuffix : prefix or suffix the label with additional text. eg. labelPrefix:'modified by '
!Code
***/
//{{{
(function($) {

if(!config.macros.image) {
	throw "Missing dependency: ImageMacroPlugin";
}

var imageMacro = config.macros.image;
var tiddlyspace = config.extensions.tiddlyspace;
var getStatus = config.extensions.tiddlyweb.getStatus;
var endsWith = config.extensions.BinaryTiddlersPlugin.endsWith;

config.macros.view.views.SiteIcon = function(value, place, params, wikifier,
		paramString, tiddler) {
	var container = $('<div class="siteIcon" />').prependTo(place);
	var extraArgs = params.splice(2, params.length - 2).join(" ");
	var imageOptions = imageMacro.getArguments(extraArgs, []);
	var imagePlace = $("<div />").appendTo(container);
	var pos;
	if(endsWith(value, "_public")) {
		pos = value.indexOf("_public");
		value = value.substr(0, pos);
	} else if(endsWith(value, "_private")) {
		pos = value.indexOf("_private");
		value = value.substr(0, pos);
	}

	var args = paramString.parseParams("name", null, true, false, true)[0];
	var labelPrefix = args.labelPrefix ? args.labelPrefix[0] : "";
	var labelSuffix = args.labelSuffix ? args.labelSuffix[0] : "";
	if(!store.tiddlerExists(tiddler.title) || value == "None") { // some core tiddlers lack modifier
		value = "unknown";
		if(store.tiddlerExists("UnknownModifierIcon")) {
			imageMacro.renderImage(imagePlace, "UnknownModifierIcon", imageOptions);
		}
	} else {
		getStatus(function(status) {
			var uri = tiddlyspace.getAvatar(status.server_host, { name: value });
			imageMacro.renderImage(imagePlace, uri, imageOptions);
			if(!value) {
				value = "tiddlyspace";
			}
		});
	}
	$('<div class="label" />').
		text("%0%1%2".format([labelPrefix, value, labelSuffix])).
		appendTo(container);
	$(container).attr("title", value).attr("alt", value);
};

var originMacro = config.macros.tiddlerOrigin = {
	locale: {
		"private": "private",
		"public": "public",
		"privateAndPublic": "public and private tiddler",
		"privateNotPublic": "new draft of public",
		"external": "from %0",
		"external_info": "This tiddler was written by %0 in the %1 space. \n It is visible to all at:\n%2",
		"private_info": "This tiddler is currently private.\n It is visible to only members of this space at:\n%2",
		"public_info": "This tiddler is currently public with no private revision.\nIt is visible to all at:\n%2",
		"privateAndPublic_info": "This tiddler is currently public without any later private revisions.\nIt is visible to all at:\n%2",
		"privateNotPublic_info": "This tiddler is currently public, with a later private revision.\nIt is visible to all at:\n%2\nbut the content will differ depending on permissions.",
		"unknownUser": "an unknown user"
	},

	handler: function(place, macroName, params,wikifier, paramString, tiddler){
		var adaptor = tiddler.getAdaptor();
		var imageOptions = imageMacro.getArguments(paramString, []);
		var locale = originMacro.locale;
		var type = "private";
		var parsedParams = paramString.parseParams("name")[0];
		var includeLabel = parsedParams.label && parsedParams.label[0] == "yes";
		if(store.tiddlerExists(tiddler.title) || store.isShadowTiddler(tiddler.title)) {
			var space = tiddlyspace.determineSpace(tiddler, true);
			type = space && space.name == tiddlyspace.currentSpace.name ? space.type : "external";

			var tidEl = $(story.findContainingTiddler(place));
			var concertinaContentEl = $("<div />")[0];
			var concertina = $(".concertina", tidEl)[0];
			var concertinaButton = $('<a class="originButton" href="javascript:;" />').
				click(function() {
					tidEl.addClass("concertinaOn");
					$(concertina).empty();
					$(concertina).append(concertinaContentEl);
					$(concertina).toggle(500);
				}).appendTo(place);

			var label;
			var showLabel = function(type) {
				tidEl.
					removeClass("private public external privateAndPublic privateNotPublic").
					addClass(type);
				if(includeLabel) {
					$('<div class="roundelLabel" />').text(label).appendTo(concertinaButton);
				}
				concertinaButton.prependTo(place).attr("title", label);
			};

			if(type != "external") {
				var showPrivacyRoundel = function(context) {
					if(context && context.status) { // there is a public tiddler as well as the current tiddler!
						// to do: not this is not enough.. we also need to check if the public tiddler is the same as..
						// .. the private tiddler to determine whether this is a draft
						// use of hashes would be useful here.
						if(context.tiddler.modified < tiddler.modified) { // public is older so therefore this is a draft
							label = locale.privateNotPublic;
							type = "privateNotPublic";
						} else {
							label = locale.privateAndPublic;
							type = "privateAndPublic";
						}
					}
					imageMacro.renderImage(concertinaButton[0], "%0Icon".format([type]), imageOptions);
					showLabel(type);
					originMacro.fillConcertina(concertinaContentEl, type, tiddler);
				};
				if(type == "private") { //check for a public version
					var context = {
						workspace: "bags/%0_public".format([space.name])
					};
					label = locale["private"];
					adaptor.getTiddler(tiddler.title, context, null, showPrivacyRoundel);
				} else {
					label = locale["public"];
					showPrivacyRoundel();
				}
			} else {
				label = locale.external.format([space.name || "tiddlyspace"]);
				getStatus(function(status) {
					var uri = tiddlyspace.getAvatar(status.server_host, space);
					imageMacro.renderImage(concertinaButton[0], uri, imageOptions);
					showLabel(type);
					originMacro.fillConcertina(concertinaContentEl, type, tiddler);
				});
			}
		}
	},
	fillConcertina: function(place, privacyType, tiddler) {
		if(!place) {
			return;
		} else {
			var locale = originMacro.locale;
			var space = tiddlyspace.determineSpace(tiddler);
			space = space.name ? space.name : false;
			getStatus(function(status) {
				var modifier = tiddler.modifier;
				if(modifier == "None") {
					modifier = locale.unknownUser;
				}
				var spaceLink, link;
				if(!space) {
					space = "core";
					link = "[[/%0|/%0]]".format([tiddler.title]);
				} else {
					spaceLink = tiddlyspace.getHost(status.server_host, space);
					space = "[[%0|%1]]".format([space, spaceLink]);
					link = "%0/%1".format([spaceLink, tiddler.title]);
				}

				var localeString = locale["%0_info".format([privacyType])];
				if(localeString) {
					wikify(localeString.format([modifier, space, link]), place);
				}
			});
		}
	}
};

})(jQuery);
//}}}
