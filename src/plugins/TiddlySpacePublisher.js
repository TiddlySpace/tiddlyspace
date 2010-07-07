/***
|''Name''|TiddlySpacePublisher|
|''Description''|Adds a random color palette to TiddlyWiki|
|''Requires''|TiddlySpacePublishCommand|
|''Author''|Jon Robson|
|''Version''|0.1.1|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/blob/master/src/plugins/TiddlySpacePublisher.js|
|''License''|[[BSD|http://www.opensource.org/licenses/bsd-license.php]]|
!Usage
{{{
<<TiddlySpacePublisher>>
creates an interface with which you can manage unpublished versions of tiddlers.
}}}
!Params
filter: allows you to run the publisher on a filtered set of tiddlers.
eg. filter:[tag[systemConfig]]

!Code
***/
/*{{{*/
(function($){
	var macro = config.macros.TiddlySpacePublisher = {
		locale: {
			title: "Publisher",
			updatedPrivateTiddler: "newer than published version {{viewPublicTiddler{%0}}}",
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
				{ name: "Text", field: "text", title: "Text", type: "String" },
				{ name: "Status", field: "status", title: "Status", type: "WikiText" }
			],
			rowClasses:[
				{ className: "updated", field: "updated" },
				{ className: "notPublished", field: "notPublished" }
			]
		},

		publishedTiddlers: {}, // maps tiddler titles to a currently public tiddler where public tiddlers exist
		getPublicTiddlers: function(listWrapper, paramString, spaceName) { // fills in publishedTiddlers variable above
			ajaxReq({
				url: "/recipes/"+ spaceName + "_public/tiddlers.json",
				success: function(tiddlers){
					for(var i = 0; i < tiddlers.length; i++) {
						var tid = tiddlers[i];
						macro.publishedTiddlers[tid.title] = tid;
					}
					macro.refresh(listWrapper, paramString);
				}
			});
		},
		makePublic: function(e, listWrapper, paramString){ // this is what is called when you click the publish button
			var wizard = new Wizard(e.target);
				var listView = wizard.getValue("listView");
				var rowNames = ListView.getSelectedRows(listView);
				var callback = function(status) {
					macro.refresh(listWrapper, paramString);
				};
				for(var i = 0; i < rowNames.length; i++) {
					var title = rowNames[i];
					macro.publishedTiddlers[title] = store.getTiddler(title);
					config.commands.publishTiddlerRevision.publishTiddler(title, callback);
				}
		},
		handler: function(place, macroName, params, wikifier, paramString) {
			var wizard = new Wizard();
			var locale = macro.locale;
			wizard.createWizard(place,locale.title);
			wizard.addStep(macro.locale.description, '<input type="hidden" name="markList"></input>');
			var markList = wizard.getElement("markList");
			var listWrapper = document.createElement("div");
			markList.parentNode.insertBefore(listWrapper, markList);
			listWrapper.setAttribute("refresh", "macro");
			listWrapper.setAttribute("macroName", "SpaceManager");
			listWrapper.setAttribute("params", paramString);
			
			$(listWrapper).text(macro.locale.pleaseWait);
			this.getPublicTiddlers(listWrapper,paramString, config.extensions.tiddlyspace.currentSpace.name);
		},
		refresh: function(listWrapper, paramString){
			var wizard = new Wizard(listWrapper);
			var locale = macro.locale;
			var selectedRows = [];
			ListView.forEachSelector(listWrapper, function(e,rowName) {
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
			var spaceName = config.extensions.tiddlyspace.currentSpace.name;
			var privateBag = spaceName +"_private";
			for(var t = 0; t < unpublishedTiddlers.length; t++) {
				var include = false;
				var tiddler = unpublishedTiddlers[t];
				var bag = tiddler.fields["server.bag"];
				if(!tiddler.tags.contains("excludePublisher")) {
					if(bag == privateBag) {
						var candidate = {
							title:tiddler.title,
							tiddler:tiddler,
							text: tiddler.text.substr(0,100)
						};
						if(tiddler.text.length > 100) {
							candidate.text += "... ";
						}
						var publishedTiddler = publishedTiddlers[tiddler.title];
						if(publishedTiddler) {
							var publishedModified = publishedTiddler.modified;
							if(typeof(publishedModified) == typeof("")) {
								publishedModified = Date.convertFromYYYYMMDDHHMM(publishedModified);
							}
							if(publishedModified < tiddler.modified) {
								candidate.status = "%0".format([locale.updatedPrivateTiddler.format([tiddler.title])]);
								candidate.publicTiddler = publishedTiddler;
								candidate.updated = true;
								include = true;
							}
						} else {
							candidate.status = "unpublished";
							include = true;
							candidate.notPublished = true;
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
						{caption: locale.makePublicLabel, tooltip: locale.makePublicPrompt, onClick: btnHandler}
					]);
			}
		}
	};
})(jQuery);
