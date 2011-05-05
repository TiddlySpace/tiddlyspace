/***
|''Name''|ErrorHandlerPlugin|
|''Version''|0.4.3|
|''Author''|Jon Robson|
|''Description''|Localised tiddler save errors including edit conflict resolution.|
|''CoreVersion''|2.6.1|
|''Requires''|TiddlySpaceConfig|
***/
//{{{
(function($) {

var tiddlyspace = config.extensions.tiddlyspace;
var currentSpace = tiddlyspace.currentSpace.name;
tiddlyspace.getLocalTitle = function(title, workspace, suffix) {
	var endsWith = config.extensions.BinaryTiddlersPlugin.endsWith;
	if(!suffix) {
		var isPublic = endsWith(workspace, "_public");
		suffix = tiddlyspace.resolveSpaceName(workspace);
		if(currentSpace == suffix) {
			suffix = isPublic ? "public" : "private";
		} else {
			suffix = "@%0".format(suffix);
		}
	}
	return "%0 *(%1)*".format(title, suffix);
};

var sssp = config.extensions.ServerSideSavingPlugin;

var msgs = config.messages.editConflict = {
	loading: "Loading..",
	resolve: "[[Edit Conflict]]@glossary: this tiddler may have been changed by someone else.",
	reviewDiff: "review (recommended)",
	reviewDiffTooltip: "review changes made to this tiddler",
	reviewDiffError: "error retrieving revision.",
	save: "overwrite",
	saveTooltip: "make this revision the top revision of this tiddler",
	discard: "cancel",
	discardTooltip: "undo changes to this tiddler and get most recent version",
	diffTitle: "%0",
	diffFieldTitle: "%0 - fields",
	diffTextTitle: "%0 - text",
	updating: "updating your version...",
	diffHeader: ["Review the changes that have been made whilst you were editing this tiddler. ",
		"Fold relevant changes back into your version.\n",
		"{{removed{Red}}} highlight shows content removed. ",
		"{{added{Green}}} highlight shows content added.\n"].join(""),
	diffTextHeader: "View changes in text",
	diffFieldsHeader: "View changes in fields"
};

var plugin = config.extensions.errorHandler = {
	diffTags: ["excludeLists", "excludeMissing", "excludeSearch"],
	displayMessage: function(message, tiddler, context) {
		var desc = context && context.httpStatus ? context.statusText :
			sssp.locale.connectionError;
		var reportArea = plugin.reportError(tiddler.title);
		var msg = $("<div />").appendTo(reportArea);
		if(message == "saveConflict") {
			wikify(msgs.resolve, msg[0]);
			var choiceArea = $("<div />").appendTo(reportArea)[0];
			plugin.editConflictHandler(choiceArea, tiddler);
		} else {
			msg.text(sssp.locale[message].format(tiddler.title, desc));
		}
	},
	editConflictHandler: function(container, tiddler) {
		var title = tiddler.title;
		var myrev = tiddler.fields["server.page.revision"];
		// note user now needs to edit, fix problem and save. 
		// TODO: make sure this gets reset in save callback
		store.getTiddler(title).fields["server.page.revision"] = "false";

		var diffBtn = createTiddlyButton(container, msgs.reviewDiff, msgs.reviewDiffTooltip, function(ev) {
			var title = $(ev.target).data("title");
			plugin.displayDiff(ev.target, store.getTiddler(title), myrev);
		});
		var saveBtn = createTiddlyButton(container, msgs.save, msgs.saveTooltip, function(ev) {
				var title = $(ev.target).data("title");
				var tid = store.saveTiddler(store.getTiddler(title));
				autoSaveChanges(null, [tid]);
			});
		var ignoreBtn = createTiddlyButton(container, msgs.discard, msgs.discardTooltip, function(ev) {
			var title = $(ev.target).text(msgs.updating).data("title");
			plugin.resetToServerVersion(store.getTiddler(title));
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
		var tags = plugin.diffTags;
		newTiddler.text = msgs.loading;
		newTiddler.fields.doNotSave = true;
		newTiddler.tags = diff ? tags.concat(["diff"]) : tags;
		newTiddler = store.saveTiddler(newTiddler);
		$.extend(store.getTiddler(title).fields,
			config.defaultCustomFields); // allow option to save it
		return newTiddler;
	},
	displayDiff: function(src, tiddler, latestRevision) {
		var adaptor = tiddler.getAdaptor();
		var title = tiddler.title;
		var ts = new Date().formatString("0hh:0mm:0ss");
		var suffix = "edit conflict %0".format(ts);
		var diffTitle = tiddlyspace.getLocalTitle(msgs.diffTitle.format(title), "", suffix);
		var diffTextTitle = tiddlyspace.getLocalTitle(msgs.diffTextTitle.format(title), "", suffix);
		var diffFieldsTitle = tiddlyspace.getLocalTitle(msgs.diffFieldTitle.format(title), "", suffix);
		plugin.makeDiffTiddler(diffTextTitle, true);
		plugin.makeDiffTiddler(diffFieldsTitle, true);
		var newTiddler = plugin.makeDiffTiddler(diffTitle, false);
		newTiddler.text = ['%0\n<<slider chkViewDiffText "%1" "%2">>\n',
			'<<slider chkViewDiffField "%3" "%4">>'].join("").
			format(msgs.diffHeader, diffTextTitle, msgs.diffTextHeader,
				diffFieldsTitle, msgs.diffFieldsHeader);
		store.saveTiddler(newTiddler);

		var callback = function(r) {
			var text = plugin.getDiffTiddlerTexts(r);
			store.getTiddler(diffTextTitle).text = text[0];
			store.getTiddler(diffFieldsTitle).text = text[1];
			story.refreshTiddler(diffTitle, null, true);
		};
		var workspace = "bags/%0".format(tiddler.fields["server.bag"]);
		ajaxReq({
			type: "get",
			dataType: "text",
			url: "/diff?format=unified&rev1=%0/%1/%2&rev2=%0/%1".format(workspace, title, latestRevision),
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

sssp.reportFailure = function(message, tiddler, context) {
	config.options.chkViewDiffText = config.options.chkViewDiffText === undefined ?
		true : config.options.chkViewDiffText;
	config.options.chkViewDiffFields = config.options.chkViewDiffFields || false;
	plugin.displayMessage(message, tiddler, context);
};

})(jQuery);
//}}}
