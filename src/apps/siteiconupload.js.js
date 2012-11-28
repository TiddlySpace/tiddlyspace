(function($) {

var $siteicon = $("#siteicon"),
	$messageArea = $("#messageArea");

function initSiteIconUpload(spaceName) {
	var publicBag = spaceName + "_public",
		csrf = window.getCSRFToken(),
		form = $('#upload')[0],
		$submit = $(form).find("[type=submit]");

	$siteicon.attr("src", "/bags/" + publicBag + "/tiddlers/SiteIcon");
	$submit.attr("disabled", true);
	$(form)
		.attr("action", "/bags/" + publicBag + "/tiddlers?csrf_token=" + csrf + "&redirect=/tiddlers")
		.find("[type=file]")
			.change(function(ev) {
				($(this).val() !== "") ? $submit.attr("disabled", false) : $submit.attr("disabled", true);
			})
			.end()
		.ajaxForm({
			success: function(a) {
				$siteicon.attr("src", "/bags/" + publicBag + "/tiddlers/SiteIcon?r=" + Math.random());
				$submit.attr("disabled", true);
			},
			error: function() {
				$messageArea.html("Error uploading SiteIcon.");
			}
		});

	// check HTML5 features available
	if(isFileAPIEnabled() && isDndEnabled()) {
		var dndc = new DNDFileController('dropzone', publicBag);
	} else {
		// drag and drop not available
		$("#dropzone").hide();
	}
}

// feature detection
var isDndEnabled = function() {
	return 'draggable' in document.createElement('span');
};

var isFileAPIEnabled = function() {
	return !!(window.File && window.FileList && window.FileReader);
};

// seems to work without needing CSRF token, is that correct?
function DNDFileController(id, publicBag) {
	var $el = $("#" + id),
		el_ = document.getElementById(id),
		$html = $("html");

	this.dragenter = function(e) {
		e.stopPropagation();
		e.preventDefault();
		$html.addClass("dragging");
	};

	this.dragover = function(e) {
		e.stopPropagation();
		e.preventDefault();
		e.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
	};

	this.dragleave = function(e) {
		e.stopPropagation();
		e.preventDefault();
		$html.removeClass("dragging");
	};

	this.drop = function(e) {
		e.stopPropagation();
		e.preventDefault();

		var files = e.dataTransfer.files; // FileList object.
	
		// Loop through the FileList
		for (var i = 0, f; f = files[i]; i++) {

			// Only process image files.
			if (!f.type.match('image.*')) {
				continue;
			}
			handleFile(f);
		}

		$html.removeClass("dragging");
		return false;
	};

	var handleFile = function(file) {

		// read in files
		var reader = new FileReader();
		reader.onerror = function(ev) {
			console.log('error', ev);
		};

		// things to do once file is read in
		reader.onload = function(ev) {
			var data = ev.target.result.replace(/^data[^,]*,/, ''),
				$dzimg = $("#dropzone img");

			$dzimg.removeClass("notloading");

			var tiddler = {
					tags: [],
					text: data,
					title: "SiteIcon",
					type: file.type
				};

			$.ajax({
				url: '/bags/' + publicBag + '/tiddlers/' + tiddler.title,
				contentType: 'application/json',
				type: 'PUT',
				data: JSON.stringify(tiddler),
				processData: false,
				success: function() {
					$siteicon.attr("src", "/bags/" + publicBag + "/tiddlers/SiteIcon?r=" + Math.random());
					$dzimg.addClass("notloading");
				},
				error: function(xhr, error, exc) {
					$messageArea.html("Error uploading SiteIcon.");
					$dzimg.addClass("notloading");
				}
			});
		};

		reader.readAsDataURL(file);
	};

	// don't use jQuery because it changes event properties...
	el_.addEventListener("dragenter", this.dragenter, false);
	el_.addEventListener("dragover", this.dragover, false);
	el_.addEventListener("dragleave", this.dragleave, false);
	el_.addEventListener("drop", this.drop, false);
}

// make initSiteIconUpload globally accessible
window.initSiteIconUpload = initSiteIconUpload;

}(jQuery));

