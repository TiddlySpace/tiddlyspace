/*global $:false, window:false, tiddlyweb:false, document:false */
ts.init(function(ts) {

	"use strict";

	/*
	 * If we aren't in a space, do nothing
	 */
	if(!ts.currentSpace) {
		return;
	}

	var address = window.location.hostname.split("."),
		spaceName = address[0],
		publicBag = spaceName + "_public",
		publicBagUrl = "/bags/" + publicBag + "/tiddlers",
		space = new tiddlyweb.Space(spaceName, "/"),
		tiddler = new tiddlyweb.Tiddler("SiteInfo",
			new tiddlyweb.Bag(publicBag, "/"));

	/*
	 * Display the number of tiddlers in this space.
	 */
	function displayTiddlerCounts(tiddlers, url, numMembers) {
		var data = $.trim(tiddlers),
			numTiddlers = data ? data.split("\n").length : 0,
			html = "";
		function printFullInfo(numPublicTiddlers) {
			var totalTiddlers = numPublicTiddlers + numTiddlers;
			html += ['This space has ', numMembers,
				(numMembers <= 1) ? ' member,' : ' members,',
				' <a href="/tiddlers">', totalTiddlers,
				' local tiddlers</a>, <a href="' + url + '">',
				numTiddlers,
				(numTiddlers === 0 || numTiddlers > 1) ? ' are' : ' is',
				' private</a> and <a href="',
				publicBagUrl, '">',
				numPublicTiddlers,
				(numPublicTiddlers === 0 || numPublicTiddlers > 1) ? ' are' : ' is',
					' public</a>.'].join("");
			$("#info").html(html);
		}
		if(numMembers) {
			$.ajax({
				url: publicBagUrl,
				dataType: "text",
				success: function(tiddlers) {
					var data = $.trim(tiddlers),
						count = data ? data.split("\n").length : 0;
					printFullInfo(count);
				}
			});
		} else {
			html += 'This space has <a href="' +
				url +
				'">' +
				numTiddlers +
				" public tiddlers</a>";
			$("#info").html(html);
		}
	}

	/*
	 * Count the number of tiddlers in this space.
	 */
	function countTiddlers(members) {
		var numMembers = members ? members.length : false,
			url = members ? "/bags/" + spaceName + "_private/tiddlers" :
					publicBagUrl;
		$.ajax({
			url: url,
			dataType: "text",
			success: function(tiddlers) {
				displayTiddlerCounts(tiddlers, url, numMembers);
			}
		});
	}

	/*
	 * Update SiteInfo display
	 */
	function completeEdit(tiddler) {
		$("#siteinfo .edit").show();
		$("#siteinfo .value").data("tiddler", tiddler).
			empty().html(tiddler.render);
	}

	/*
	 * Turn on the editor for SiteInfo
	 */
	function siteInfoEditor(tiddler) {
		var errback = function() {
			$("#siteinfo .edit").click();
			$("<div class='error' />").text("Error occurred whilst saving.").prependTo("#siteinfo .value");
		};
		$("<button class='edit' />").click(function(ev) {
			var editBtn = $(ev.target),
				val = $(".value", $(ev.target).parent("#siteinfo")[0]),
				wikitext = $(val).data("tiddler").text;
			$(editBtn).hide();
			$(val).empty();
			$("<textarea />").val(wikitext).appendTo(val);
			$("<button />").text("save").click(function(ev) {
				var text = $("textarea", val).val();
				$(val).empty().text("saving...");
				tiddler.text = text;
				tiddler.put(function() {
					tiddler.get(function(tid) {
						tiddler = tid;
						completeEdit(tid);
					}, errback, "render=y");
				}, errback);
				$(editBtn).show();
			}).appendTo(val);
			$("<button />").text("cancel").
				click(function(ev) {
					completeEdit(tiddler);
				}).appendTo(val);
		}).text("edit").appendTo("#siteinfo");
	}

	/*
	 * SiteInfo handling
	 */
	function initSiteInfo() {
		$("<div class='value' />").
			text("(Loading SiteInfo tiddler)").
			data("tiddler", tiddler).appendTo("#siteinfo");
		tiddler.get(
			function(tid) {
				tiddler = tid;
				$("#siteinfo .value").
					data("tiddler", tid).
					html(tid.render || tid.text);
				if ($(document.body).hasClass("ts-member")) {
					siteInfoEditor(tid);
				}
			},
			function() {
				$("#siteinfo .value").
					text("This space has not published any information " +
						"about itself.");
				if ($(document.body).hasClass("ts-member")) {
					siteInfoEditor(tiddler);
				}
			},
			"render=1"
		);
	}

	$("#siteUrl").text(window.location.hostname);
	initSiteIconUpload(spaceName);

	space.members().get(function(members) {
		countTiddlers(members);
	}, function() {
		countTiddlers();
	});

	initSiteInfo();

}); // end of ts.init

function toggleNext(ev) {
	var label1 = "hide",
		label2 = "show",
		target = $(ev.target).parent().next(),
		visible = $(ev.target).hasClass("open") ? true : false;
	$(target).stop(true, true);
	if(!visible) {
		$(target).slideDown(200);
		$(ev.target).addClass("open").text(label1);
	} else {
		if($(target).parents().is(":hidden")) {
			// see http://forum.jquery.com/topic/slideup-doesn-t-work-with-hidden-parent
			$(target).hide();
		} else {
			$(target).slideUp(200);
		}
		$(ev.target).removeClass("open").text(label2);
	}
}

// setup hide/show sliders
$(".toggleNext").each(function(i, el) {
	$(el).addClass("open").click(toggleNext);
	toggleNext({ target: el });
});

if(window !== window.top) {
	$("html").addClass("iframeMode");
	$("a").live("click", function(ev) {
		$(ev.target).attr("target", "_blank");
	});
}
