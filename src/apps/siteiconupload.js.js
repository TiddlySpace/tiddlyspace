function initSiteIconUpload(spaceName) {
	var publicBag = spaceName + "_public",
		csrf = window.getCSRFToken(),
		form = $('#upload')[0],
		$submit = $(form).find("[type=submit]");

	$("#siteicon").attr("src", "/bags/" + publicBag + "/tiddlers/SiteIcon");
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
				$("#siteicon").attr("src", "/bags/" + publicBag + "/tiddlers/SiteIcon?r=" + Math.random());
				$submit.attr("disabled", true);
			},
			error: function() {
				$('#messageArea').html("Error uploading SiteIcon.")
			}
		});
}
