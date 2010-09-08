/***
|''Name''|BinaryUploadPlugin|
|''Version''|0.3.6|
|''Author''|Ben Gillies and Jon Robson|
|''Type''|plugin|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/raw/master/src/plugins/BinaryUploadPlugin.js|
|''Description''|Upload a binary file to TiddlyWeb|
|''Requires''|TiddlySpaceConfig|
!Usage
{{{
<<binaryUpload bag:<name> edit:tags edit:title tags:<default tags> title:<title> >>
}}}
* {{{bag:<name>}}}: optional; if left out, the file will be saved to the current workspace
* {{{edit:tags}}}: specifies that you want to tag the file being uploaded
* {{{edit:title}}}: specifies that you want to set the title to something other than the filename
* {{{tags:<default tags>}}}: specifies a default set of tags to apply to the file (requires {{{edit:tags}}} to be set)
* {{{title:<title>}}}: predefines the title of the binary tiddler
!Requires
TiddlyWeb
tiddlywebplugins.form
!Code
***/
//{{{
(function($) {

var macro = config.macros.binaryUpload ={
	locale: {
		titleDefaultValue: "Please enter a title...",
		tagsDefaultValue: "Please enter some tags...",
		titlePrefix: "title: ",
		tagsPrefix: "tags: ",
		loadSuccess: 'Tiddler %0 successfully uploaded',
		loadError: "An error occurred when uploading the tiddler %0",
		uploadInProgress: "Please wait while the file is uploaded..."
	},
	createUploadForm: function(place, tiddler, options) {
		var bag = options.bag;
		var editableFields = options.edit;
		var defaults = config.defaultCustomFields;
		var locale = macro.locale;
		place = $('<div class="container" />').appendTo(place)[0];
		var uploadTo = bag ? "bags/%0".format([bag]) : defaults["server.workspace"];
		var includeFields = {
			tags:  editableFields && editableFields.contains("tags") ? true : false,
			title: editableFields && editableFields.contains("title") ? true : false
		};

		var baseURL = defaults["server.host"];
		baseURL += (baseURL[baseURL.length - 1] !== "/") ? "/" : "";
		baseURL = "%0%1/tiddlers".format([baseURL, uploadTo]);
		//create the upload form, complete with invisible iframe
		var iframeName = "binaryUploadiframe%0".format([Math.random()]);
		var editables = [];
		var fields = ["title", "tags"];
		for(var i = 0; i < fields.length; i++) {
			var fieldName = fields[i];
			var userDefault = options[fieldName];
			var defaultValue = userDefault ? userDefault : false;
			if(includeFields[fieldName] || defaultValue) {
				var localeDefault = locale["%0DefaultValue".format([fieldName])];
				var className = defaultValue ? "userInput" : "userInput notEdited";
				var inputEl;
				var val = defaultValue || localeDefault;
				if(defaultValue && !includeFields[fieldName]) {
					inputEl = $('<input type="hidden" /><input type="text" disabled />');
				} else {
					inputEl = $('<input type="text" />');
				}
				inputEl.attr("name", fieldName).
					addClass("%0Edit".format([fieldName])).
					val(val).addClass(className);

				var editEl = $("<span />").text(locale["%0Prefix".format([fieldName])]).
					appendTo('<div class="binaryUpload%0"></div>'.format([fieldName])).
					append(inputEl)[0];
				editables.push(editEl);
			}
		}

		var pleaseWait = $('<div />').text(locale.uploadInProgress).hide().appendTo(place);
		var frameHtml = '<form class="binaryUploadForm" action="%0" method="POST" enctype="multipart/form-data" />'.
			format([baseURL]);
		$(frameHtml).
			append(editables).
			append('<div class="binaryUploadFile"><input type="file" name="file" /></div>').
			append('<div class="binaryUploadSubmit"><input type="submit" value="Upload" /></div>').
			submit(function(ev) {
				this.target = iframeName;
				var existingVal = $("input[name=title]", place).val();
				var fileName = existingVal || $('input:file', place).val();
				if (!fileName) {
					return false; // the user hasn't selected a file yet
				}
				var fStart = fileName.lastIndexOf("\\");
				var fStart2 = fileName.lastIndexOf("/");
				fStart = fStart < fStart2 ? fStart2 : fStart;
				fileName = fileName.substr(fStart+1);
				$("input[name=title]", place).val(fileName);
				var form = $(this);
				// we need to go somewhere afterwards to ensure the onload event triggers
				this.action = "%0?redirect=/tiddlers".format([baseURL, fileName]); // dont use jquery to work with ie
				/*$('<iframe name="%0" id="%0" />'.format([iframeName])).
					css('display','none').appendTo(place);*/
				$(place).append($('<iframe name="' + iframeName + '" id="' + iframeName + '"/>').css('display','none'));
				macro.iFrameLoader(iframeName, fileName, place, uploadTo, tiddler, baseURL, function() {
					form.show(1000);
					pleaseWait.hide(1000);
				});
				form.hide(1000);
				pleaseWait.show(1000);
				return true;
			}).appendTo(place);

		$(".notEdited", place).mousedown(function(ev) { // clear default text on click
			var target = $(ev.target);
			if(target.hasClass("notEdited")) {
				target.removeClass("notEdited");
				target.val("");
			}
		});

		$("input[name=file]", place).change(function(ev) {
			var target = $(ev.target);
			var fileName = target.val();
			var titleInput = $("input[name=title]", place);
			if((includeFields[fieldName] && titleInput.hasClass("notEdited")) || !titleInput.val()) {
				titleInput.val(fileName);
			}
			titleInput.removeClass("notEdited"); // allow editing on this element.
		});
	},
	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		params = paramString.parseParams(null, null, true);
		macro.createUploadForm(place, tiddler, params[0]);
	},
	iFrameLoader: function(iframeName, fileName, place, workspace, tiddler, baseurl, callback) {
		var iframe = document.getElementById(iframeName); //jQuery doesn't seem to want to do this!?
		var locale = macro.locale;
		$(".userInput").addClass("notEdited"); // reset editing
		var finishedLoading = function() {
			displayMessage(locale.loadSuccess.format([fileName]));
			var url = "%0/%1".format([baseurl, fileName]);
			$.getJSON(url, function(file) {
				macro.displayFile(place, fileName, workspace, tiddler);
				$(iframe).remove();
				refreshDisplay();
				callback(url);
			});
		};
		var iFrameLoadHandler = function() {
			finishedLoading.apply();
			return;
		};

		iframe.onload = iFrameLoadHandler;
		//IE
		completeReadyStateChanges = 0;
		iframe.onreadystatechange = function() {
			if (++(completeReadyStateChanges) == 3) {
				iFrameLoadHandler();
			}
		};
	},
	displayFile: function(place, title, workspace, tiddler) {
		var adaptor = tiddler.getAdaptor();
		var context = {
			workspace: workspace
		};
		adaptor.getTiddler(title, context, null, function(context) {
			if(context.status) {
				store.addTiddler(context.tiddler);
				story.displayTiddler(place, title);
				var image = config.macros.image;
				if(image && image.refreshImage) {
					image.refreshImage("/%0/tiddlers/%1".format([workspace, title]));
					image.refreshImage(title);
					image.refreshImage("%0/%1/tiddlers/%2".format([config.extensions.tiddlyweb.host, workspace, title]));
				}
			} else {
				displayMessage(locale.loadError.format([title]));
			}
		});
	}
};

config.macros.binaryUploadPublic = {
	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		params = paramString.parseParams(null, null, true);
		var options = params[0];
		options.bag = "%0_public".
			format([config.extensions.tiddlyspace.currentSpace.name]);
		macro.createUploadForm(place, tiddler, options);
	}
};

})(jQuery);
//}}}
