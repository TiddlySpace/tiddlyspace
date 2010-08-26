/***
|''Name''|TiddlySpaceTiddlerIconsPlugin|
|''Version''|0.5.2dev|
|''Status''|@@beta@@|
|''Author''|Jon Robson|
|''Description''|Provides ability to render SiteIcons and icons that correspond to the home location of given tiddlers|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/raw/master/src/plugins/TiddlySpaceTiddlerIconsPlugin.js|
|''Requires''|TiddlySpaceConfig BinaryTiddlersPlugin ImageMacroPlugin TiddlySpacePublishingCommands|
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
var cmd = config.commands.publishTiddler;

config.macros.view.views.SiteIcon = function(value, place, params, wikifier,
		paramString, tiddler) {
	var container = $('<div class="siteIcon" />').prependTo(place);
	var extraArgs = params.splice(2, params.length - 2).join(" ");
	var imageOptions = imageMacro.getArguments(extraArgs, []);
	var imagePlace = $("<div />").appendTo(container)[0];
	var pos;
	var endsWith = config.extensions.BinaryTiddlersPlugin.endsWith;
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
		if(store.tiddlerExists("missingIcon")) {
			imageMacro.renderImage(imagePlace, "missingIcon", imageOptions);
		}
	} else {
		getStatus(function(status) {
			var uri = tiddlyspace.getAvatar(status.server_host, value);
			imageMacro.renderImage(imagePlace, uri, imageOptions);
			if(!value) {
				value = "tiddlyspace";
			}
		});
	}
	$('<div class="label" />').text(labelPrefix + value + labelSuffix).
		appendTo(container);
	$(container).attr("title", value).attr("alt", value);
};

var originMacro = config.macros.tiddlerOrigin = {
	locale: {
		"shadow": "shadow tiddler",
		"missing": "missing tiddler",
		"private": "private",
		"unknown": "unknown state",
		"public": "public",
		"privateAndPublic": "public and private tiddler",
		"privateNotPublic": "private different to public",
		"external": "from %0",
		"missing_info": "This tiddler does not currently exist in the space.\nIt is possible you reached this via a broken link",
		"external_info": "This tiddler was written by %0 in the %1 space. \nIt is visible to all at:\n%2",
		"private_info": "This tiddler is currently private.\n It is visible to only members of this space at:\n%2\n\n",
		"public_info": "This tiddler is currently public with no private revision.\nIt is visible to all at:\n%2",
		"privateAndPublic_info": "This tiddler is currently public without any later private revisions.\nIt is visible to all at:\n%2",
		"privateNotPublic_info": "This tiddler is currently public, with a different private revision. You are currently viewing the private version.\nIt is visible to all at:\n%2\nbut the content will differ depending on permissions.\n\n",
		"shadow_info": "This tiddler is a special tiddler that is part of the TiddlySpace application. It has no uri.",
		"unknownUser": "an unknown user",
		"makePublic": "Make this tiddler public",
		"makePrivate": "Make this tiddler private",
		"deletePrivate": "Delete the private version of this tiddler",
		"deletePublic": "Delete the public version of this tiddler",
		publishPrivateDeletePrivate: "Are you sure you want to publish this tiddler?\nNote that all private versions of this tiddler will be deleted however all public versions will be retained.\n Hit cancel to abort.",
		publishPrivateKeepPrivate: "Are you sure you want to publish this tiddler?\nNote that any existing public versions of this tiddler will be deleted. Hit cancel to abort.",
		retainPrivateRevisions: "Also copy over the private revisions of this tiddler",
		retainPublicRevisions: "Also copy over the public revisions of this tiddler",
		moveToPrivate: "Are you sure you want to make this private? It will no longer be publically available to non-members of the space and you will lose any existing revisions.",
		moveToPrivateKeep: "Are you sure you want to make this tiddler and all its revisions private? It will no longer be publically available to non-members of the space.",
		"publicConfirmDelete": "Are you sure you want to delete all the public revisions of this tiddler?",
		"privateConfirmDelete": "Are you sure you want to delete all the private revisions of this tiddler?"
	},
	createConcertinaButton: function(place, concertinaContent) {
		var concertinaButton = $('<a class="originButton" href="javascript:;" />').
			click(function(ev) {
				var tidEl = $(story.findContainingTiddler(place));
				var concertina = $(".concertina", tidEl);
				concertina.empty().
					append(concertinaContent);
				if(concertina.attr("openedby") == "origin") {
					tidEl.removeClass("concertinaOn");
					concertina.slideUp(500).attr("openedby", "");
				} else {
					tidEl.addClass("concertinaOn");
					concertina.slideDown(500).
						attr("openedby", "origin");
				}
			}).appendTo(place);
			return concertinaButton[0];
	},
	determineTiddlerType: function(tiddler, options, callback) {
		var isShadow = store.isShadowTiddler(tiddler.title);
		var exists = store.tiddlerExists(tiddler.title);
		if(isShadow && !exists) {
			callback("shadow");
		} else if(!exists) {
			callback("missing");
		} else {
			var space = options.space;
			if(space && space.name == tiddlyspace.currentSpace.name) {
				var parts = tiddler.fields["server.workspace"].split("_"); // TODO: use the split function in TiddlySpaceConfig
				var spaceType = parts[parts.length - 1];
				var type = ["public", "private"].contains(spaceType) ? spaceType : false;
				originMacro.distinguishPublicPrivateType(tiddler, options, type, callback);
			} else {
				callback("external");
			}
		}
	},
	distinguishPublicPrivateType: function(tiddler, options, type, callback) {
		var space = options.space;
		var adaptor = tiddler.getAdaptor();
		var determineType = function(privateTiddler, publicTiddler) {
			if(publicTiddler && !privateTiddler) {
				return "public";
			} else if(privateTiddler && !publicTiddler) {
				return "private";
			} else if(originMacro.areIdentical(privateTiddler, publicTiddler)) {
				return "privateAndPublic";
			} else {
				return "privateNotPublic";
			}
		};
		var context;
		if(type == "private") { //check for a public version
			// is there a public version in store?
			var title = tiddler.title;
			var publicVersion = store.getTiddler("%0 [public]".format([title]));
			if(!publicVersion) {
				context = {
					workspace: "bags/%0_public".format([space.name])
				};
				adaptor.getTiddler(tiddler.title, context, null, function(context) {
					if(context) {
						var publicTiddler = context.status ? context.tiddler : false;
						callback(determineType(tiddler, publicTiddler));
					}
				});
			} else { // we have a public tiddler in the local store.
				callback(determineType(tiddler, publicVersion));
			}
		} else {
			var serverTitle = tiddler.fields["server.title"];
			if(serverTitle && serverTitle != tiddler.title) { // viewing a spawned public tiddler
				callback(determineType(store.getTiddler(serverTitle), tiddler));
			} else {
				context = {
					workspace: "bags/%0_private".format([space.name])
				};
				adaptor.getTiddler(tiddler.title, context, null, function(context) {
					if(context) {
						var privateTiddler = context.status ? context.tiddler : false;
						callback(determineType(privateTiddler, tiddler));
					}
				});
			}
		}
	},
	handler: function(place, macroName, params,wikifier, paramString, tiddler){
		var adaptor = tiddler.getAdaptor();
		var locale = originMacro.locale;
		var type = "private";
		var parsedParams = paramString.parseParams("name")[0];
		var includeLabel = parsedParams.label && parsedParams.label[0] == "yes";
		var options = {
			labelOptions: { includeLabel: includeLabel },
			imageOptions: imageMacro.getArguments(paramString, [])
		};
		if(tiddler && tiddler.fields["server.workspace"]) {
			name = tiddler.fields["server.workspace"].replace("recipes/", "").
			replace("bags/", "");
		} else {
			name = tiddler;
		}
		options.space = tiddlyspace.determineSpace(name, true);
		var concertinaContentEl = $("<div />")[0];

		var concertinaButton = originMacro.createConcertinaButton(place, concertinaContentEl);
		type = originMacro.determineTiddlerType(tiddler, options, function(type) {
			originMacro.renderIcon(tiddler, type, concertinaButton,
				concertinaContentEl, options);
		});
	},
	renderIcon: function(tiddler, type, concertinaButton, concertinaContentEl, options) {
		var locale = originMacro.locale;
		if(type != "external") {
			originMacro.showPrivacyRoundel(tiddler, type, concertinaButton,
				concertinaContentEl, options);
		} else {
			var label = locale.external.format([options.space.name || "tiddlyspace"]);
			getStatus(function(status) {
				var uri = tiddlyspace.getAvatar(status.server_host, options.space.name);
				imageMacro.renderImage(concertinaButton, uri, options.imageOptions);
				var labelOptions = options.labelOptions;
				labelOptions.label = label;
				originMacro.showLabel(concertinaButton, type, labelOptions);
				originMacro.fillConcertina(concertinaContentEl, type, tiddler);
			});
		}
	},
	areIdentical: function(tiddler1, tiddler2) {
		var sameText = tiddler1.text == tiddler2.text;
		var sameTags = true;
		var tags1 = tiddler1.tags;
		var tags2 = tiddler2.tags;
		if(tags1.length != tags2.length) {
			sameTags = false;
		} else {
			for(var i = 0; i < tags2.length; i++) {
				if(!tags1.contains(tags2[i])) {
					sameTags = false;
				}
			}
		}
		var fields1 = tiddler1.fields;
		var fields2 = tiddler2.fields;
		var allFields = fields1;
		for(var field in fields2) {
			if(typeof(allFields[field]) == "undefined") {
				allFields[field] = false;
			}
		}
		var sameFields = true;
		var ignoreList = ["changecount", "doNotSave"];
		for(var field in allFields) {
			if(field.indexOf("server.") !== 0 && !ignoreList.contains(field)) { // ignore server fields
				if(!fields2[field]) {
					sameFields = false;
				} else if(fields2[field] != fields1[field]) {
					sameFields = false;
				}
			}
		}
		return sameText && sameTags &&  sameFields;
	},
	showPrivacyRoundel: function(thisTiddler, privacyType, concertinaButton, concertinaContentEl, options) {
		// there is a public tiddler as well as the current tiddler!
		// to do: not this is not enough.. we also need to check if the public tiddler is the same as..
		// .. the private tiddler to determine whether this is a draft
		// use of hashes would be useful here.
		imageMacro.renderImage(concertinaButton, "%0Icon".format([privacyType]), options.imageOptions);
		originMacro.showLabel(concertinaButton, privacyType, options.labelOptions);
		originMacro.fillConcertina(concertinaContentEl, privacyType, thisTiddler);
	},
	showLabel: function(concertinaButton, type, options) {
		var locale = originMacro.locale;

		var tidEl = $(story.findContainingTiddler(concertinaButton));

		label = options.label ? options.label : locale[type];

		tidEl.
			removeClass("private public external privateAndPublic privateNotPublic shadow").
			addClass(type);
		if(options && options.includeLabel) {
			$('<div class="roundelLabel" />').text(label || locale.unknown).appendTo(concertinaButton);
		}
		$(concertinaButton).attr("title", label);
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
				var title = tiddler.fields["server.title"] || tiddler.title;
				if(!space) {
					space = "core";
					link = "[[/%0|/%0]]".format([title]);
				} else {
					spaceLink = tiddlyspace.getHost(status.server_host, space);
					space = "[[%0|%1]]".format([space, spaceLink]);
					link = "[[%0/%1|%0/%1]]".format([spaceLink, title]);
				}

				var localeString = locale["%0_info".format([privacyType])];
				if(localeString){
					wikify(localeString.format([modifier, space, link]), place);
				}
				var command = originMacro.concertinaCommands[privacyType];
				if(command && tiddler) {
					command(place, tiddler);
				}
			});
		}
	},
	concertinaCommands: {
		"public": function(place, tiddler) {
			var locale = originMacro.locale;
			var chk = $('<input type="checkbox" checked="true" name="retainPublicRevisions" />');
			var doPublish = function(ev) {
				var checked = chk.attr("checked");
				var msg = checked ? locale.moveToPrivateKeep : locale.moveToPrivate;
				var answer = confirm(msg);
				if(answer) {
					var privateWorkspace = cmd.toggleWorkspace(tiddler, "private");
					cmd.moveTiddler(tiddler, {
						title: tiddler.title,
						fields: { "server.workspace": privateWorkspace }
					}, chk.attr("checked"));
				}
			};
			var toggleCheckbox = function(ev) {
				if (chk.attr("checked")) {
					chk.attr("checked", true);
				} else {
					chk.attr("checked", false);
				}
			};
			var link = $('<a class="publishButton" />').text(locale.makePrivate).
			click(doPublish).appendTo(place);
			chk.appendTo(place);
			$("<span />").click(toggleCheckbox).
				text(locale.retainPublicRevisions).appendTo(place);
		},
		"private": function(place, tiddler) {
			var locale = originMacro.locale;
			var adaptor = tiddler.getAdaptor();
			var chk = $('<input type="checkbox" checked="true" name="retainRevisions" />');
			var toggleCheckbox = function(ev) {
				if (chk.attr("checked")) {
					chk.attr("checked", true);
				} else {
					chk.attr("checked", false);
				}
			};
			var doPublish = function(ev) {
				var publishTo = tiddler.fields["server.publish.name"];
				var workspace = "bags/%0".format([tiddler.fields["server.bag"]]);
				tiddler.fields["server.workspace"] = workspace;
				var publicWorkspace = cmd.toggleWorkspace(tiddler, "public");
				var msg;
				var checked = chk.attr("checked");
				msg = checked ? locale.publishPrivateKeepPrivate : locale.publishPrivateDeletePrivate;
				var title = tiddler.title;
				var newTitle = publishTo || tiddler.title;
				tiddler.fields["server.page.revision"] = "false";
				store.addTiddler(tiddler);
				var answer = confirm(msg);
				if(answer) {
					cmd.moveTiddler(tiddler, {
						title: newTitle,
						fields: { "server.workspace": publicWorkspace }
					}, checked);
				}
			};
			var link = $('<a class="publishButton" />').text(locale.makePublic).
			click(doPublish).appendTo(place);
			chk.appendTo(place);
			$("<span />").click(toggleCheckbox).
				text(locale.retainPrivateRevisions).appendTo(place);
		},
		privateNotPublic: function(place, tiddler) {
			originMacro.concertinaCommands["private"](place, tiddler);
			originMacro.concertinaCommands.privateAndPublic(place, tiddler);
		},
		privateAndPublic: function(place, tiddler) {
			var locale = originMacro.locale;
			var deleteTiddler = function(type) {
				type = type ? type.toLowerCase() : "public";
				var workspace = cmd.toggleWorkspace(tiddler.fields["server.workspace"], type);
				if(confirm(locale["%0ConfirmDelete".format([type])])) {
					config.commands.deleteTiddler.deleteResource(tiddler, workspace);
				}
			};
			var deletePublic = function(ev) {
				deleteTiddler("public");
			};
			var deletePrivate = function(ev) {
				deleteTiddler("private");
			};
			$('<a class="publishButton" />').text(locale.deletePublic).
				click(deletePublic).appendTo(place);
			$('<a class="publishButton" />').text(locale.deletePrivate).
				click(deletePrivate).appendTo(place);
		}
	}
};

})(jQuery);
//}}}
