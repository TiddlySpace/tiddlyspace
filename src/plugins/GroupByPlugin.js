/***
|''Name''|GroupByPlugin|
|''Description''|Mimics allTags macro to provide ways of creating lists grouping tiddlers by any field|
|''Version''|0.6.1|
|''Author''|Jon Robson|
|''Status''|beta|
!Usage
{{{<<groupBy tags>>}}}
mimics allTags macro

{{{<<groupBy server.bag>>}}}
groups by the server.bag field (this version contains TiddlySpace specific code for turning a bag into a space name)

{{{groupBy modified dateFormat:"YYYY"}}}
group tiddlers by year.

{{{<<groupBy tags exclude:excludeLists exclude:systemConfig>>}}}
group tiddlers by tag but exclude the tags with values excludeLists and systemConfig

Within that group you can also exclude things by filter
{{{groupBy modifier filter:[tag[film]]}}}
will group tiddlers tagged with film by modifier.
***/
//{{{
(function($) {
var taglocale = config.views.wikified.tag;
var macro = config.macros.groupBy = {
	locale: {
		tooltip: "all tiddlers in group %0",
		noTiddlers: "no tiddlers",
		openAllText: taglocale.openAllText,
		openAllTooltip: taglocale.openAllTooltip,
		openTiddler: "open tiddler with title %0"
	},
	morpher: {
		// TODO: note currently the following 2 morphers are TiddlySpace specific and probably should be in separate plugin
		"server.workspace": function(value, options) {
			return macro.morpher["server.bag"](value.replace("bags/", "").replace("recipes/", ""));
		},
		"server.bag": function(value, options) {
			if(typeof(value) !== "string") {
				return false;
			} else if(value.indexOf("_public") === -1 && value.indexOf("_private") === -1) {
				value = "*%0".format(value); // add star for non-space bags.
			}
			return value.replace("_public", "").replace("_private", "");
		},
		created: function(value, options) {
			return value.formatString(options.dateFormat || "DD MMM YYYY");
		},
		modified: function(value, options) {
			return macro.morpher.created(value, options);
		}
	},

	handler: function(place, macroName, params, wikifier, paramString) {
		var field = params[0] || "server.workspace";
		var dateFormat = params[1] || "DD MMM YYYY";
		var container = $("<div />").attr("macroName", macroName).addClass("groupBy").
			attr("refresh", "macro").attr("fieldName", field).
			attr("paramString", paramString).
			attr("dateFormat", dateFormat).appendTo(place)[0];
		macro.refresh(container);
	},
	isTypeArray: function(value) {
		var valueType = typeof value;
		if(valueType === "object" && typeof value.length === "number" &&
			!(value.propertyIsEnumerable("length")) &&
			typeof value.splice === "function") { //is Array
			return true;
		} else {
			return false;
		}
	},
	_onClickGroup: function(ev, options) {
		var i, target = ev.target, locale = macro.locale;
		var tiddlers = $(target).closest(".templateContainer").data("tiddlers");
		var popup = $(Popup.create(target)).addClass("taggedTiddlerList")[0];
		var value = $(target).attr("value");
		var openAll = createTiddlyButton($("<li />").appendTo(popup)[0],
			locale.openAllText.format(value), locale.openAllTooltip);
		$(openAll).click(function(ev) {
			story.displayTiddlers(ev.target, tiddlers);
			return false;
		});
		var listBreak = $("<li />").addClass("listBreak").html("<div />").appendTo(popup);
		for(i = 0; i < tiddlers.length; i++) {
			var item = $("<li />").appendTo(popup)[0];
			var template = store.getTiddlerText(options.template) || macro.template;
			wikify(template, item, null, tiddlers[i]);
		}
		listBreak.clone().appendTo(popup);
		$(createTiddlyLink($("<li />").appendTo(popup)[0], value, false)).
			text(locale.openTiddler.format(value));
		Popup.show();
		ev.stopPropagation();
		return false;
	},
	_refresh: function(container, tiddlers, options) {
		var totalGroups = 0, locale = macro.locale, i, j;
		var excludeValues = options.exclude;
		var values = {}, value_ids = [];
		var field = options.field;
		var morpher = macro.morpher[field] || function(value) {
			return value;
		};
		for(i = 0; i < tiddlers.length; i++) {
			var tiddler = tiddlers[i];
			var value = tiddler[field] || tiddler.fields[field];
			value = macro.isTypeArray(value) ? value : [ value ];
			for(j = 0; j < value.length; j++) {
				var v = morpher(value[j], options);
				if(v && excludeValues.indexOf(v) === -1) {
					totalGroups += 1;
					if(!values[v]) {
						values[v] = [];
					}
					values[v].push(tiddler);
					value_ids.pushUnique(v);
				}
			}
		}
		var ul = $("<ul />").appendTo(container)[0];
		if(totalGroups === 0) {
			$("<li />").addClass("listTitle").text(locale.noTiddlers);
		}
		value_ids = value_ids.sort();
		var groupTemplate = store.getTiddlerText(options.groupTemplate);
		var onClick = function(ev) {
			macro._onClickGroup(ev, options);
		};
		for(i = 0; i < value_ids.length; i++) {
			var title = value_ids[i];
			var info = getTiddlyLinkInfo(title);
			tiddlers = values[title];
			var btn = createTiddlyButton($("<li />").appendTo(ul)[0],
				"%0 (%1)".format(title, tiddlers.length), locale.tooltip.format(title), null, info.classes);
			if(groupTemplate) {
				$(btn).empty();
				wikify(groupTemplate, btn, null, tiddlers[0]);
			}
			$(btn).click(onClick).attr("value", title).attr("refresh", "link").attr("tiddlyLink", title);
			$(btn).addClass("templateContainer").data("tiddlers", tiddlers);
		}
	},
	refresh: function(container) {
		container = $(container).empty();
		var paramString = container.attr("paramString");
		var args = paramString.parseParams("name", null, true, false, true)[0];
		var options = { field: container.attr("fieldName"), dateFormat: container.attr("dateFormat"), exclude: args.exclude || [],
			template: args.template ? args.template[0] : false, groupTemplate: args.groupTemplate ? args.groupTemplate[0] : "" };
		var tiddlers = args.filter ? store.filterTiddlers(args.filter[0]) : store.getTiddlers("title");
		macro._refresh(container, tiddlers, options);
	},
	template: "<<view title link>>"
};

}(jQuery));
//}}}
