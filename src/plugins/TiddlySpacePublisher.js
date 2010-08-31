/***
|''Name''|TiddlySpacePublisher|
|''Version''||
|''Description''|Provides a batch publishing tool for managing lots of tiddlers in TiddlySpace|
|''Requires''|TiddlySpacePublishCommand TiddlySpaceTiddlerIconsPlugin|
|''Author''|Jon Robson|
|''Version''|0.3.0|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/blob/master/src/plugins/TiddlySpacePublisher.js|
|''License''|[[BSD|http://www.opensource.org/licenses/bsd-license.php]]|
!Usage
{{{
<<TiddlySpacePublisher>>
creates an interface with which you can manage unpublished versions of tiddlers.
}}}
!Parameters
filter: allows you to run the publisher on a filtered set of tiddlers.
eg. filter:[tag[systemConfig]]

!TODO
batch publishing for the other way round (public to private)

!Code
***/
//{{{
(function($) {

var currentSpace = config.extensions.tiddlyspace.currentSpace.name;
var originMacro = config.macros.tiddlerOrigin;

var macro = config.macros.TiddlySpacePublisher = {
	locale: {
		title: "Publisher",
		updatedPrivateTiddler: "newer than published version (click {{viewPublicTiddler{%0}}} to view)",
		makePublicLabel: "Make public",
		noTiddlersText: "No tiddlers to publish",
		makePublicPrompt: "Make all the selected tiddlers public.",
		description: "Publish tiddlers to public version of this space",
		pleaseWait: "please wait while we load the publisher... "
	},

	listViewTemplate: {
		columns: [
			{ name: "Selected", field: "Selected", rowName: "title", type: "Selector" },
			{ name: "Tiddler", field: "tiddler", title: "Tiddler", type: "Tiddler" },
			{ name: "Status", field: "status", title: "Status", type: "WikiText" }
		],
		rowClasses: [
			{ className: "updated", field: "updated" },
			{ className: "notPublished", field: "notPublished" }
		]
	},

	publishedTiddlers: {}, // maps tiddler titles to a currently public tiddler where public tiddlers exist
	getPublicTiddlers: function(listWrapper, paramString, spaceName, tiddler) { // fills in publishedTiddlers variable above
		var adaptor = tiddler.getAdaptor();
		var context = {
			workspace: "recipes/%0_public".format([spaceName])
		};
		var callback = function(context, userParams) {
			if(context.status) {
				var tiddlers = context.tiddlers;
				for(var i = 0; i < tiddlers.length; i++) {
					var tid = tiddlers[i];
					macro.publishedTiddlers[tid.title] = tid;
				}
				macro.refresh(listWrapper, paramString);
			}
		};
		adaptor.getTiddlerList(context, null, callback);
	},
	makePublic: function(e, listWrapper, paramString) { // this is what is called when you click the publish button
		var wizard = new Wizard(e.target);
			var listView = wizard.getValue("listView");
			var rowNames = ListView.getSelectedRows(listView);
			var callback = function(status) {
				macro.refresh(listWrapper, paramString);
			};
			var cmd = config.commands.publishTiddler;
			var publicWorkspace;
			for(var i = 0; i < rowNames.length; i++) {
				var title = rowNames[i];
				var tiddler = store.getTiddler(title);
				if(!publicBag) {
					publicBag = cmd.toggleBag(tiddler, "public");
				}
				macro.publishedTiddlers[title] = tiddler;
				var newTiddler = {
					title: tiddler.title,
					fields: { "server.bag": publicBag }
				};
				config.commands.publishTiddler.moveTiddler(tiddler, newTiddler, true, callback);
			}
	},
	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var wizard = new Wizard();
		var locale = macro.locale;
		wizard.createWizard(place, locale.title);
		wizard.addStep(macro.locale.description, '<input type="hidden" name="markList" />');
		var markList = wizard.getElement("markList");
		var listWrapper = document.createElement("div");
		markList.parentNode.insertBefore(listWrapper, markList);
		listWrapper.setAttribute("refresh", "macro");
		listWrapper.setAttribute("macroName", "SpaceManager");
		listWrapper.setAttribute("params", paramString);

		$(listWrapper).text(macro.locale.pleaseWait);
		this.getPublicTiddlers(listWrapper, paramString, currentSpace, tiddler);
	},
	refresh: function(listWrapper, paramString) {
		var wizard = new Wizard(listWrapper);
		var locale = macro.locale;
		var selectedRows = [];
		ListView.forEachSelector(listWrapper, function(e, rowName) {
			if(e.checked) {
				selectedRows.push(e.getAttribute("rowName"));
			}
		});
		removeChildren(listWrapper);
		var params = paramString.parseParams("anon");
		var publishCandidates = [];
		var unpublishedTiddlers;
		var filter = params[0].filter;
		if(filter) {
			unpublishedTiddlers = store.filterTiddlers(filter[0]);
		} else {
			unpublishedTiddlers = store.getTiddlers();
		}
		var publishedTiddlers = macro.publishedTiddlers;
		var privateBag = currentSpace + "_private";
		for(var t = 0; t < unpublishedTiddlers.length; t++) {
			var include = false;
			var tiddler = unpublishedTiddlers[t];
			var bag = tiddler.fields["server.bag"];
			if(!tiddler.tags.contains("excludePublisher")) {
				if(bag == privateBag) {
					var candidate = {
						title: tiddler.title,
						tiddler: tiddler
					};
					var publishedTiddler = publishedTiddlers[tiddler.title];
					if(!publishedTiddler) {
						candidate.status = "unpublished";
						include = true;
						candidate.notPublished = true;
					} else if(!originMacro.areIdentical(tiddler, publishedTiddler)) {
						candidate.status = locale.updatedPrivateTiddler.format([tiddler.title]);
						candidate.publicTiddler = publishedTiddler;
						candidate.updated = true;
						include = true;
					}
					if(include) {
						publishCandidates.push(candidate);
					}
				}
			}
		}

		if(publishCandidates.length === 0) {
			createTiddlyElement(listWrapper, "em", null, null, locale.noTiddlersText);
		} else {
			var listView = ListView.create(listWrapper, publishCandidates, macro.listViewTemplate);
			wizard.setValue("listView", listView);

			var btnHandler = function(ev) {
				macro.makePublic(ev, listWrapper, paramString);
			};
			wizard.setButtons([
				{ caption: locale.makePublicLabel, tooltip: locale.makePublicPrompt, onClick: btnHandler }
			]);
		}

		var publicLinks = $(".viewPublicTiddler");
		$.each(publicLinks, function(index, el) {
			el = $(el);
			var title = el.text();
			el.empty();
			var handler = function(ev) {
				ev.preventDefault();
				var tiddler = store.getTiddler(title);
				config.extensions.tiddlyspace.spawnPublicTiddler(tiddler, el);
			};
			$('<a href="javascript:;" />').text(title).click(handler).appendTo(el);
		});
	}
};

var unpublishedTabText = 'Unpublished "Manage unpublished tiddlers" TabUnpublished';
config.shadowTiddlers.TabMore = config.shadowTiddlers.TabMore.replace(
	"TabMoreShadowed", "TabMoreShadowed %0".format([unpublishedTabText]));

})(jQuery);
//}}}
