/***
|''Name''|ErrorHandlerPlugin|
|''Version''|0.4.0|
|''Author''|Jon Robson|
|''Description''|Localised tiddler save errors including edit conflict resolution.|
|''Requires''|TiddlyWebConfig|
***/

//{{{
(function($) {

var plugin = config.extensions.ServerSideSavingPlugin;

var msgs = config.messages.editConflict = {
	loading: "Loading..",
	resolve: "Resolution of issue required. A user has edited this tiddler at the same time as you",
	reviewDiff: "review difference (recommended)",
	reviewDiffTooltip: "View a diff of the changes that have been made since you edited.",
	reviewDiffError: "error retrieving revision.",
	save: "save anyway",
	saveTooltip: "Ignore the changes made",
	discard: "discard this change",
	discardTooltip: "Discard your changes and reset to server version",
	diffTitle: "%0 [edit conflict %1]",
	diffFieldTitle: "%0 - fields [edit conflict %1]",
	diffTextTitle: "%0 - text [edit conflict %1]",
	updating: "updating your version...",
	diffHeader: ["Review the changes that have been made whilst you were editing this tiddler. ",
			"Fold relevant changes back into your version.\n",
		"{{removed{Red}}} highlight shows content removed. ",
		"{{added{Green}}} highlight shows content added.\n"].join(""),
	diffTextHeader: "View changes in text",
	diffFieldsHeader: "View changes in fields"
};

var ext = config.extensions.errorHandler = {
	diffTags: ["excludeLists", "excludeMissing", "excludeSearch"],
	displayMessage: function(message, tiddler, context) {
		var desc = context && context.httpStatus ? context.statusText :
			plugin.locale.connectionError;
		var reportArea = ext.reportError(tiddler.title);
		var msg = $("<div />").appendTo(reportArea);
		if(message == "saveConflict") {
			msg.text(msgs.resolve);
			var choiceArea = $("<div />").appendTo(reportArea)[0];
			ext.editConflictHandler(choiceArea, tiddler);
		} else {
			msg.text(plugin.locale[message].format(tiddler.title, desc));
		}
	},
	editConflictHandler: function(container, tiddler) {
		var title = tiddler.title;
		var myrev = tiddler.fields["server.page.revision"];
		// note user now needs to edit, fix problem and save. 
			// todo: make sure this gets reset in save callback
		store.getTiddler(title).fields["server.page.revision"] = "false";

		var diffBtn = createTiddlyButton(container, msgs.reviewDiff, msgs.reviewDiffTooltip, function(ev) {
			var title = $(ev.target).data("title");
			ext.displayDiff(ev.target, store.getTiddler(title), myrev);
		});
		var saveBtn = createTiddlyButton(container, msgs.save, msgs.saveTooltip, function(ev) {
				var title = $(ev.target).data("title");
				var tid = store.saveTiddler(store.getTiddler(title));
				autoSaveChanges(null, [tid]);
			});
		var ignoreBtn = createTiddlyButton(container, msgs.discard, msgs.discardTooltip, function(ev) {
			var title = $(ev.target).text(msgs.updating).data("title");
			ext.resetToServerVersion(store.getTiddler(title));
		});
		$([diffBtn, ignoreBtn, saveBtn]).data("title", title);
	},
	getDiffTiddlerTexts: function(diffText) {
		var chunks = diffText.split("\n  \n");
		if(chunks.length < 2) {
			return [chunks[0], ""];
		} else {
			var diffFieldsText = "{{diff{\n%0\n}}}".format(chunks[0]);
			diffText = '{{diff{\n%0\n}}}'.format(chunks.splice(1, chunks.length).join("\n"));
			return [diffText, diffFieldsText];
		}
	},
	makeDiffTiddler: function(title, diff) {
		var newTiddler = new Tiddler(title);
		var tags = ext.diffTags;
		newTiddler.text = msgs.loading;
		newTiddler.tags = diff ? tags.concat(["diff"]) : tags;
		newTiddler = store.saveTiddler(newTiddler);
		$.extend(store.getTiddler(title).fields,
			config.defaultCustomFields); // allow option to save it.
		return newTiddler;
	},
	displayDiff: function(src, tiddler, latestRevision) {
		var adaptor = tiddler.getAdaptor();
		var title = tiddler.title;
		var ts = new Date().formatString("0hh:0mm:0ss");
		var diffTitle = msgs.diffTitle.format(title, ts);
		var diffTextTitle = msgs.diffTextTitle.format(title, ts);
		var diffFieldsTitle = msgs.diffFieldTitle.format(title, ts);
		ext.makeDiffTiddler(diffTextTitle, true);
		ext.makeDiffTiddler(diffFieldsTitle, true);
		var newTiddler = ext.makeDiffTiddler(diffTitle, false);
		newTiddler.text = ['%0\n<<slider chkViewDiffText "%1" "%2">>\n',
			'<<slider chkViewDiffField "%3" "%4">>'].join("").
			format(msgs.diffHeader, diffTextTitle, msgs.diffTextHeader,
				diffFieldsTitle, msgs.diffFieldsHeader);
		store.saveTiddler(newTiddler);

		var callback = function(r) {
			var text = ext.getDiffTiddlerTexts(r);
			store.getTiddler(diffTextTitle).text = text[0];
			store.getTiddler(diffFieldsTitle).text = text[1];
			story.refreshTiddler(diffTitle, null, true);
		};
		var workspace = "bags/%0".format(tiddler.fields["server.bag"]);
		ajaxReq({
			type: "get",
			dataType: "text",
			url: "/diff?rev1=%0/%1/%2&rev2=%0/%1".format(workspace, title, latestRevision),
			success: callback,
			error: function() {
				displayMessage(msgs.reviewDiffError);
			}
		});
		story.displayTiddler(src, diffTitle);
	},
	resetToServerVersion: function(tiddler) {
		var adaptor = tiddler.getAdaptor();
		var ctx = { 
			host: tiddler.fields["server.host"],
			workspace: "bags/" + tiddler.fields["server.bag"]
		};
		adaptor.getTiddler(tiddler.title, ctx, null, function(context) {
			store.saveTiddler(context.tiddler);
			story.refreshTiddler(tiddler.title);
			store.setDirty(false);
		});
	},
	reportError: function(title) {
		var el = story.getTiddler(title);
		if(!el) {
			el = story.displayTiddler(null, title);
		}
		return $("<div />").addClass("error annotation").prependTo(el)[0];
	}
};


plugin.reportFailure = function(message, tiddler, context) {
	config.options.chkViewDiffText = config.options.chkViewDiffText == "undefined" ?
		true : config.options.chkViewDiffText;
	config.options.chkViewDiffFields = config.options.chkViewDiffFields == "undefined" ?
		false : config.options.chkViewDiffFields;

	ext.displayMessage(message, tiddler, context);
};

})(jQuery);
//}}}
