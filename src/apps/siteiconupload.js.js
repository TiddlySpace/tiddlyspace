function initSiteIconUpload(spaceName) {
	var publicBag = spaceName + "_public";

	var csrf = window.getCSRFToken();
	$("#siteicon").attr("src", "/bags/" + publicBag + "/tiddlers/SiteIcon");
	var form = $('#upload')[0];
	$(form).attr("action", "/bags/" + publicBag + "/tiddlers?csrf_token=" + csrf + "&redirect=/tiddlers");
	$(form).ajaxForm({
		success: function(a) {
			$("#siteicon").attr("src", "/bags/" + publicBag + "/tiddlers/SiteIcon?r=" + Math.random());
		},
		error: function() {
			$('#messageArea').html("Error uploading SiteIcon.")
		}
	});
}
