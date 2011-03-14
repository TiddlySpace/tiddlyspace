/***
|''Name''|TiddlySpaceSearcher|
|''Version''|0.2.5|
|''Requires''|TiddlySpaceConfig TiddlySpaceFollowingPlugin|
***/
//{{{
(function($) {
var tiddlyspace = config.extensions.tiddlyspace;
var tsScan = config.macros.tsScan;

config.shadowTiddlers.SearchTemplate = "<<view server.bag SiteIcon label:no width:24 height:24 preserveAspectRatio:yes>> <<view server.bag spaceLink title external:no>> in space <<view server.bag spaceLink>>";
config.shadowTiddlers.StyleSheetSearch = [".resultsArea .siteIcon { display: inline; }",
	".searchForm {text-align: left;}"].join("\n");
store.addNotification("StyleSheetSearch", refreshStyles);

var search = config.macros.tsSearch = {
	locale: {
		advanced: "Advanced Options",
		header: "Search",
		resultsHeader: "Results (%0)",
		find: "find",
		noResults: "No tiddlers matched your search query",
		query: "QUERY: ",
		error: "please provide a search query or a tag, modifier or title!",
		titleAdvanced: "where the title is",
		modifierAdvanced: "where the last modifier is",
		spaceAdvanced: "only in the space: ",
		notspaceAdvanced: "but not in the spaces: ",
		tagsAdvanced: "with the tags: "
	},
	andConstructor: function(container, label, fieldname, negationMode) {
		var tags = $("<div />").appendTo(container);
		$('<span />').text(label).appendTo(tags);
		var id = "area" + Math.random();
		container = $("<span />").attr("id", id).appendTo(tags)[0];
		function add(container) {
			var el = $('<input type="text" />').attr("field", fieldname).appendTo(container);
			if(negationMode) {
				el.attr("negation", "true");
			}
		}
		add(container);
		var el = $("<button />").text("AND").click(function(ev) {
			add($(ev.target).data("container"));
			ev.preventDefault();
		}).appendTo(tags);
		$(el).data("container", container);
	},
	fieldConstructor: function(container, label, field) {
		container = $("<div />").appendTo(container)[0];
		$("<span />").text(label).appendTo(container);
		$("<input />").attr("text", "input").attr("field", field).appendTo(container);
	},
	advancedOptions: function(form) {
		var locale = search.locale;
		var container = $("<div />").addClass("tsAdvancedOptions").appendTo(form)[0];
		$("<h2/ >").text(search.locale.advanced).appendTo(container);
		$("<div />").addClass("separator").appendTo(container);
		search.fieldConstructor(container, locale.titleAdvanced, "title");
		search.fieldConstructor(container, locale.modifierAdvanced, "modifier");
		search.fieldConstructor(container, locale.spaceAdvanced, "space");
		search.andConstructor(container, locale.notspaceAdvanced, "space", true);
		search.andConstructor(container, locale.tagsAdvanced, "tag");
	},
	constructSearchQuery: function(form) {
		var data = [], select = [];
		var query = $("[name=q]", form).val();
		if(query) {
			data.push("q=%0".format(query));
		}

		// add tags, fields etc..
		$("[field]", form).each(function(i, el) {
			var val = $(el).val();
			var name = $(el).attr("field");
			var negate = $(el).attr("negation") == "true";
			if(val && name) {
				val = encodeURIComponent(val);
				val = negate ? "!" + val : val;
				if(name == "space") {
					val += "_public";
					name = "bag";
				}
				if(negate) {
					select.push("select=%0:%1".format(name,val));
				} else {
					var prefix = data.length === 0 ? "q=" : "";
					data.push('%0%1:"%2"'.format(prefix, name, val));
				}
			}
		});
		var dataString = data.join(" ");
		if(dataString.length === 0 && !query) {
			return false;
		}
		var selectStatement = select.join("&");
		if(dataString.length > 0 && selectStatement.length > 0) {
			dataString += "&";
		}
		dataString += selectStatement;
		return "/search?%0".format(dataString);
	},
	constructForm: function(place) {
		var locale = search.locale;
		$("<h1 />").text(locale.header).appendTo(place);
		var form = $("<form />").appendTo(place)[0];
		$('<input type="text" name="q" />').appendTo(form);
		$('<input type="submit" />').val(locale.find).appendTo(form);
		search.advancedOptions(form);
		var query = $('<h2 class="query"/>').appendTo(place)[0];
		var results = $("<div />").appendTo(place).addClass("resultsArea")[0];
		var lookup = function(url) {
			if(!url) {
				results.empty().addClass("error").text(locale.error);
				return;
			}
			config.extensions.tiddlyweb.getStatus(function(status) {
				$(query).text(locale.query);
				var href = status.server_host.url + url;
				$("<a />").attr("href", href).text(href).appendTo(query);
				tsScan.scan(results, { url: url, emptyMessage: search.locale.noResults, cache: true,
					template: "SearchTemplate", sort: "title", callback: function(tiddlers) {
						$("<h2 />").text(locale.resultsHeader.format(tiddlers.length)).prependTo(results);
					}
				});
			});
		};
		$(form).submit(function(ev) {
			ev.preventDefault();
			var url = search.constructSearchQuery(form);
			config.macros.tsSearch.lastSearch = url;
			lookup(url);
		});
		if(search.lastSearch) {
			lookup(search.lastSearch);
		}
		return form;
	},
	handler: function(place) {
		var container = $("<div />").addClass("searchForm").appendTo(place)[0];
		search.constructForm(container);
	}
}

})(jQuery);
//}}}
