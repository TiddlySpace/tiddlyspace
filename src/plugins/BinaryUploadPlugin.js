/***
|''Name''|BinaryUploadPlugin|
|''Version''|0.3.15|
|''Author''|Ben Gillies and Jon Robson|
|''Type''|plugin|
|''Source''|http://github.com/TiddlySpace/tiddlyspace/raw/master/src/plugins/BinaryUploadPlugin.js|
|''Description''|Upload a binary file to TiddlyWeb|
|''CoreVersion''|2.6.1|
|''Requires''|TiddlySpaceConfig TiddlyWebConfig|
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

var tiddlyspace = config.extensions.tiddlyspace;

var macro = config.macros.binaryUpload = {
	locale: {
		titleDefaultValue: "Please enter a title...",
		tagsDefaultValue: "Please enter some tags...",
		titlePrefix: "title: ",
		tagsPrefix: "tags: ",
		loadSuccess: 'Tiddler %0 successfully uploaded',
		loadError: "An error occurred when uploading the tiddler %0",
		uploadInProgress: "Please wait while the file is uploaded...",
		membersOnly: "Only members can upload."
	},
	renderInputFields: function(container, options) {
		var locale = macro.locale;
		var editableFields = options.edit;
		var includeFields = {
			tags:  editableFields && editableFields.contains("tags") ? true : false,
			title: editableFields && editableFields.contains("title") ? true : false
		};
		var fields = ["title", "tags"];
		for(var i = 0; i < fields.length; i++) {
			var fieldName = fields[i];
			var userDefault = options[fieldName];
			var defaultValue = userDefault ? userDefault[0] : false;
			if(includeFields[fieldName] || defaultValue) {
				var localeDefault = locale["%0DefaultValue".format(fieldName)];
				var className = defaultValue ? "userInput" : "userInput notEdited";
				var inputEl;
				var val = defaultValue || localeDefault || "";
				var iContainer = $("<div />").addClass("binaryUpload%0".format(fieldName)).
					appendTo(container);
				if(defaultValue && !includeFields[fieldName]) {
					var label = locale["%0Prefix".format(fieldName)];
					$("<span />").text(label).appendTo(iContainer);
					$("<span />").addClass("disabledInput").text(val).appendTo(iContainer);
					inputEl = $("<input />").attr("type", "hidden");
				} else {
					inputEl = $("<input />").attr("type", "text");
				}
				inputEl.attr("name", fieldName).
					addClass("%0Edit".format(fieldName)).
					val(val).addClass(className).appendTo(iContainer);
			}
		}
	},
	getTiddlerName: function(fileName) {
		var fStart = fileName.lastIndexOf("\\");
		var fStart2 = fileName.lastIndexOf("/");
		fStart = fStart < fStart2 ? fStart2 : fStart;
		fileName = fileName.substr(fStart+1);
		return fileName;
	},
	errorHandler: function(fileName) {
		displayMessage("upload of file %0 failed".format(fileName));
	},
	uploadFile: function(place, baseURL, workspace, options) {
		var pleaseWait = $(".uploadProgress", place);
		var iframeName = options.target;
		var form = $("form", place);
		var existingVal = $("input[name=title]", form).val();
		var fileName = existingVal || $('input:file', form).val();
		if(!fileName) {
			return false; // the user hasn't selected a file yet
		}
		fileName = macro.getTiddlerName(fileName);
		$("input[name=title]", place).val(fileName);
		// we need to go somewhere afterwards to ensure the onload event triggers
		var redirectTo = "/%0/tiddlers.txt?select=title:%1".
			format(workspace, fileName);
		var token = tiddlyspace ? tiddlyspace.getCSRFToken() : "";
		var action = "%0?csrf_token=%1&redirect=%2"
			.format(baseURL, token, redirectTo);
		form[0].action = action; // dont use jquery to work with ie
		form[0].target = iframeName;
		// do not refactor following line... won't work in IE6 otherwise
		$(place).append($('<iframe name="' + iframeName + '" id="' + iframeName + '"/>').css('display','none'));
		macro.iFrameLoader(iframeName, function() {
			var content = document.getElementById(iframeName).contentWindow.document.documentElement;
			if($(content).text().indexOf(fileName) > -1) {
				options.callback(place, fileName, workspace, baseURL);
			} else {
				macro.errorHandler(fileName);
			}
			form.show(1000);
			pleaseWait.hide(1000);
		});
		form.hide(1000);
		pleaseWait.show(1000);
		return true;
	},
	createUploadForm: function(place, options) {
		var locale = macro.locale;
		if(readOnly) {
			$('<div class="annotation" />').text(locale.membersOnly).
				appendTo(place);
			return;
		}
		var bag = options.bag;
		options.callback = options.callback ? options.callback :
			function(place, fileName, workspace, baseurl) {
				macro.displayFile(place, fileName, workspace);
				displayMessage(locale.loadSuccess.format(fileName));
				$("input[type=text]", place).val("");
			};
		var defaults = config.defaultCustomFields;
		place = $("<div />").addClass("container").appendTo(place)[0];
		var workspace = bag ? "bags/%0".format(bag) : config.defaultCustomFields["server.workspace"];
		var baseURL = defaults["server.host"];
		baseURL += (baseURL[baseURL.length - 1] !== "/") ? "/" : "";
		baseURL = "%0%1/tiddlers".format(baseURL, workspace);
		//create the upload form, complete with invisible iframe
		var iframeName = "binaryUploadiframe%0".format(Math.random());
		// do not refactor following line of code to work in IE6.
		var form = $('<form action="%0" method="POST" enctype="multipart/form-data" />'.
					format(baseURL)).addClass("binaryUploadForm").
			appendTo(place)[0];
		macro.renderInputFields(form, options);
		$(form).
			append('<div class="binaryUploadFile"><input type="file" name="file" /></div>').
			append('<div class="binaryUploadSubmit"><input type="submit" value="Upload" /></div>').
			submit(function(ev) {
				this.target = iframeName;
				options.target = iframeName;
				macro.uploadFile(place, baseURL, workspace, options);
			});
		$('<div />').addClass("uploadProgress").text(locale.uploadInProgress).hide().appendTo(place);
		$("input[name=file]", place).change(function(ev) {
			var target = $(ev.target);
			var fileName = target.val();
			var title = $("input[type=text][name=title]", place);
			if(!title.val()) {
				title.val(fileName);
			}
		});
	},
	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		params = paramString.parseParams(null, null, true);
		macro.createUploadForm(place, params[0]);
	},
	iFrameLoader: function(iframeName, callback) {
		var iframe = document.getElementById(iframeName); //jQuery doesn't seem to want to do this!?
		var locale = macro.locale;
		$(".userInput").addClass("notEdited"); // reset editing
		var finishedLoading = function() {
			callback();
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
	displayFile: function(place, title, workspace) {
		var adaptor = store.getTiddlers()[0].getAdaptor();
		var context = {
			workspace: workspace,
			host: config.defaultCustomFields['server.host']
		};
		adaptor.getTiddler(title, context, null, function(context) {
			if(context.status) {
				store.addTiddler(context.tiddler);
				story.displayTiddler(place, title);
				var image = config.macros.image;
				if(image && image.refreshImage) {
					image.refreshImage("/%0/tiddlers/%1".format(workspace, title));
					image.refreshImage(title);
					image.refreshImage("/%0".format(title));
					image.refreshImage("%0/%1/tiddlers/%2".format(config.extensions.tiddlyweb.host, workspace, title));
				}
			} else {
				displayMessage(macro.locale.loadError.format(title));
			}
		});
	}
};

if(tiddlyspace) {
	config.macros.binaryUploadPublic = {
		handler: function(place, macroName, params, wikifier, paramString, tiddler) {
			var options = paramString.parseParams(null, null, true)[0];
			var bag = tiddlyspace.getCurrentBag("public");
			options.bag = bag;
			macro.createUploadForm(place, options);
		}
	};
	config.messages.privacySetting = config.options.chkPrivateMode ?
		"private" : "public";
	config.macros.binaryUpload.defaultWorkspace = tiddlyspace.
		getCurrentWorkspace(config.messages.privacySetting);
}

})(jQuery);
//}}}
