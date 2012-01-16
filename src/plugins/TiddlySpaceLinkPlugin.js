/***
|''Name:''|TiddlySpaceLinkPlugin|
|''Description:''|Formatter to reference other spaces from wikitext |
|''Author:''|PaulDowney (psd (at) osmosoft (dot) com) |
|''Source:''|http://github.com/TiddlySpace/tiddlyspace/raw/master/src/plugins/TiddlySpaceLinkPlugin.js|
|''Version:''|1.4.2|
|''License:''|[[BSD License|http://www.opensource.org/licenses/bsd-license.php]] |
|''Comments:''|Please make comments at http://groups.google.co.uk/group/TiddlyWikiDev |
|''~CoreVersion:''|2.4|
!!Documentation
This plugin provides wikitext formatters for referencing another [[space|Space]] on the same TiddlySpace server, as in the following examples:
<<<
  {{{@space}}} -- @space 
  {{{~@space}}} -- ~@space 
  {{{Tiddler@space}}} -- Tiddler@space
  {{{[[Tiddler Title]]@space}}} -- [[Tiddler Title]]@space 
  {{{[[Link text|Tiddler Title]]@space}}} -- [[Link text|Tiddler Title]]@space
<<<
Links to tiddlers with a title begining with an "@" remain as tiddlyLinks:
<<<
  {{{[[@tiddler]]}}} -- [[@tiddler]]
<<<
and these may be changed into a space link using {{{@@}}}:
<<<
  {{{[[@@space]]}}} -- [[@@space]]
  {{{[[Link to an another space|@@space]]}}} -- [[Link to another space|@@space]]
  {{{[[@space|@@space]]}}} -- [[@space|@@space]]
<<<
TiddlySpace includes the [[TiddlySpaceLinkPlugin]] which provides WikiText markup for linking to other spaces on the same server. For example @glossary is a link to the {{{glossary}}} space and [[Small Trusted Group]]@glossary a link to an individual tiddler in the @glossary space. Prefixing the link with a tilde escapes the link, for example {{{~@space}}}.
Email addresses, for example joe.bloggs@example.com and mary@had.a.little.lamb.org should be unaffected.
!!Features
The plugin provides external links decorated so that other plugins may be included to add features such as the ability to dynamically pull externally linked tiddlers into the current TiddlyWiki.
Wikitext linking to a space on another server, for example from a tiddler in a space on tiddlyspace.com to a tiddler or a space on example.com, isn't currently supported. 
!!Code
***/
//{{{
/*jslint onevar: false nomen: false plusplus: false */
/*global jQuery config createTiddlyText createExternalLink createTiddlyLink */

function createSpaceLink(place, spaceName, title, alt, isBag) {
	var link, a, currentSpaceName, label;
	try {
		if (spaceName === config.extensions.tiddlyspace.currentSpace.name) {
			title = title || spaceName;
			a = createTiddlyLink(place, title, false);
			jQuery(a).text(alt || title);
			return a;
		}
	} catch (ex1) {
		currentSpaceName = false;
	}

	a = jQuery("<a />").addClass('tiddlySpaceLink externalLink').appendTo(place)[0];
	if(title) {
		jQuery(a).attr('tiddler', title);
	}
	if(isBag) {
		jQuery(a).attr('bag', spaceName);
	} else {
		jQuery(a).attr('tiddlyspace', spaceName);
	}

	config.extensions.tiddlyweb.getStatus(function(status) {
		link = status.server_host.url;
		if (title) {
			label = alt || title;
			link = link + "/" + encodeURIComponent(title);
		} else {
			label = alt || spaceName;
		}
		// assumes a http URI without user:pass@ prefix
		if(!isBag) {
			link = link.replace("http://", "http://" + spaceName.toLowerCase() + ".");
		} else {
			link += "/bags/" + spaceName + "/tiddlers.wiki";
		}
		jQuery(a).attr("href", link).text(label);
	});
	return a;
}

(function ($) {

	config.textPrimitives.spaceName = "[a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9]";
	config.textPrimitives.spaceNameStrict = "[a-z][a-z0-9-]*";
	config.textPrimitives.bareTiddlerLetter = config.textPrimitives.anyLetterStrict;

	config.formatters.splice(0, 0, {
		name: "spacenameLink",
		match: config.textPrimitives.unWikiLink + "?" + config.textPrimitives.bareTiddlerLetter + "*@" + config.textPrimitives.spaceName + "\\.?.?",
		lookaheadRegExp: new RegExp(config.textPrimitives.unWikiLink + "?(" + config.textPrimitives.bareTiddlerLetter + "*)@(" + config.textPrimitives.spaceName + ")", "mg"),
		handler: function (w) {
			if (w.matchText.substr(w.matchText.length - 2, 1) === '.' && w.matchText.substr(w.matchText.length - 1, 1).match(/[a-zA-Z]/)) {
				w.outputText(w.output, w.matchStart, w.nextMatch);
				return;
			}
			if (w.matchText.substr(0, 1) === config.textPrimitives.unWikiLink) {
				w.outputText(w.output, w.matchStart + 1, w.nextMatch);
				return;
			}
			this.lookaheadRegExp.lastIndex = w.matchStart;
			var lookaheadMatch = this.lookaheadRegExp.exec(w.source);
			if (lookaheadMatch && lookaheadMatch.index === w.matchStart) {
				createSpaceLink(w.output, lookaheadMatch[2], lookaheadMatch[1]);
				w.nextMatch = this.lookaheadRegExp.lastIndex;
			}
		}
	},
	{
		name: "tiddlySpaceLink",
		match: "\\[\\[[^\\|\\]]*\\|*@@" + config.textPrimitives.spaceName + "\\]",
		lookaheadRegExp: new RegExp("\\[\\[(.*?)(?:\\|@@(.*?))?\\]\\]", "mg"),
		handler: function (w) {
			this.lookaheadRegExp.lastIndex = w.matchStart;
			var lookaheadMatch = this.lookaheadRegExp.exec(w.source);
			if (lookaheadMatch && lookaheadMatch.index === w.matchStart) {
				var alt = lookaheadMatch[2] ? lookaheadMatch[1] : lookaheadMatch[1].replace(/^@@/, "");
				var space = lookaheadMatch[2] || alt;
				createSpaceLink(w.output, space, "", alt);
				w.nextMatch = this.lookaheadRegExp.lastIndex;
			}
		}
	},
	{
		name: "tiddlyLinkSpacenameLink",
		match: "\\[\\[[^\\[]*\\]\\]@",
		lookaheadRegExp: new RegExp("\\[\\[(.*?)(?:\\|(.*?))?\\]\\]@(" + config.textPrimitives.spaceName + ")", "mg"),
		handler: function (w) {
			this.lookaheadRegExp.lastIndex = w.matchStart;
			var lookaheadMatch = this.lookaheadRegExp.exec(w.source);
			if (lookaheadMatch && lookaheadMatch.index === w.matchStart) {
				var title = lookaheadMatch[2] || lookaheadMatch[1];
				var alt = lookaheadMatch[1] || lookaheadMatch[2];
				createSpaceLink(w.output, lookaheadMatch[3], title, alt);
				w.nextMatch = this.lookaheadRegExp.lastIndex;
			}
		}
	});

	// ensure space links don't appear as missing links
	config.textPrimitives.brackettedLink = "\\[\\[([^\\]][^@\\]][^\\]]*)\\]\\](?=[^@])";
	config.textPrimitives.titledBrackettedLink = "\\[\\[([^\\[\\]\\|]+)\\|([^\\[\\]\\|]+)\\]\\](?=[^@])";

	// reevaluate derrived expressions ..
	config.textPrimitives.tiddlerForcedLinkRegExp = new RegExp("(?:" + config.textPrimitives.titledBrackettedLink + ")|(?:" +
		config.textPrimitives.brackettedLink + ")|(?:" +
		config.textPrimitives.urlPattern + ")","mg");
	config.textPrimitives.tiddlerAnyLinkRegExp = new RegExp("("+ config.textPrimitives.wikiLink + ")|(?:" +
		config.textPrimitives.titledBrackettedLink + ")|(?:" +
		config.textPrimitives.brackettedLink + ")|(?:" +
		config.textPrimitives.urlPattern + ")","mg");

	// treat space links in titledBracketedLink as external links
	var missingTiddlySpaceLink = new RegExp("^@@" + config.textPrimitives.spaceName + "$", "");
	var isExternalLink = config.formatterHelpers.isExternalLink;
	config.formatterHelpers.isExternalLink = function(link) {
		return missingTiddlySpaceLink.test(link) || isExternalLink(link);
	};

}(jQuery));
//}}}
