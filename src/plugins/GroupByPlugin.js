/***
|''Name''|GroupByPlugin|
|''Description''|Mimics allTags macro to provide ways of creating lists grouping tiddlers by any field|
|''Version''|0.5.4|
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
var macro = config.macros.groupBy = {
	locale: {
		tooltip: "all tiddlers in group %0",
		noTiddlers: "no tiddlers",
		openAllText: config.views.wikified.tag.openAllText,
		openAllTooltip: config.views.wikified.tag.openAllTooltip,
		openTiddler: "open tiddler with title %0"
	},
	morpher: {
		// TODO: note currently the following 2 morphers are TiddlySpace specific and probably should be in separate plugin
		"server.workspace": function(value, options) {
			return macro.morpher["server.bag"](value.replace("bags/", "").replace("recipes/", ""));
		},
		"server.bag": function(value, options) {
			if(value.indexOf("_public") == -1 && value.indexOf("_private") == -1) {
				value = "*%0".format([value]); // add star for non-space bags.
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
		var container = $("<div />").attr("macroName", macroName).
			attr("refresh", "macro").attr("fieldName", field).
			attr("paramString", paramString).
			attr("dateFormat", dateFormat).appendTo(place)[0];
		macro.refresh(container);
	},
	isTypeArray: function(value) {
		var valueType = typeof value;
		if(valueType == "object" && typeof value.length === "number" &&
			!(value.propertyIsEnumerable("length")) &&
			typeof value.splice === "function") { //is Array
			return true;
		} else {
			return false;
		}
	},
	refresh: function(place) {
		var totalGroups = 0;
		var container = $(place).empty();
		var paramString = container.attr("paramString");
		var args = paramString.parseParams("name", null, true, false, true)[0];
		var excludeValues = args.exclude || [];
		var values = {};
		var options = { dateFormat: container.attr("dateFormat") };
		var tiddlers = args.filter ? store.filterTiddlers(args.filter[0]) : store.getTiddlers();
		var field = container.attr("fieldName");
		var morpher = macro.morpher[field] || function(value) {
			return value;
		};
		for(var i = 0; i < tiddlers.length; i++) {
			var tiddler = tiddlers[i];
			var value = tiddler[field] || tiddler.fields[field];
			if(!macro.isTypeArray(value)) {
				value = [ value ];
			}
			for(var j = 0; j < value.length; j++) {
				var v = value[j];
				v = v ? morpher(v, options) : v;
				if(v && excludeValues.indexOf(v) == -1) {
					totalGroups += 1;
					if(!values[v]) {
						values[v] = [];
					}
					values[v].push(tiddler);
				}
			}
		}
		var ul = createTiddlyElement(place, "ul");
		if(totalGroups === 0) {
			createTiddlyElement(ul, "li", null, "listTitle", this.locale.noTiddlers);
		}
		var onClickGroup = function(ev) {
			var target = ev.target;
			var tiddlers = $.data(target, "tiddlers");
			var popup = Popup.create(this);
			var lingo = macro.locale;
			addClass(popup,"taggedTiddlerList");
			if(tiddlers.length > 0) {
				var value = $(target).attr("value");
				var openAll = createTiddlyButton(createTiddlyElement(popup,"li"), lingo.openAllText.format([value]), lingo.openAllTooltip, function(ev) {
					for(var i = 0; i < tiddlers.length; i++) {
						story.displayTiddler(ev.target, tiddlers[i].title);
					}
				});
				createTiddlyElement(createTiddlyElement(popup, "li", null, "listBreak"), "div");
				for(i = 0; i < tiddlers.length; i++) {
					var tiddler = tiddlers[i];
					createTiddlyLink(createTiddlyElement(popup, "li"), tiddler.title, true);
				}
				createTiddlyElement(createTiddlyElement(popup, "li", null, "listBreak"), "div");
				var h = createTiddlyLink(createTiddlyElement(popup, "li"), value, false);
				createTiddlyText(h, lingo.openTiddler.format([value]));
				Popup.show();
				ev.stopPropagation();
				return false;
			}
		};
		for(var title in values) {
			if(true) {
				var info = getTiddlyLinkInfo(title);
				var li = createTiddlyElement(ul, "li");
				var btn = createTiddlyButton(li, "%0 (%1)".format([title, values[title].length]),this.locale.tooltip.format([title]), null, info.classes);
				$(btn).click(onClickGroup);
				$.data(btn, "tiddlers", values[title]);
				$(btn).attr("value", title).attr("refresh", "link").attr("tiddlyLink", title);
			}
		}
	}
};
config.macros.allSpaces = {
	handler: function(place) {
		macro.handler(place, "groupBy", ["server.bag"]);
	}
};
})(jQuery);
//}}}
