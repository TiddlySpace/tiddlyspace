ts.init(function(ts) {

	"use strict";

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

	$("#siteUrl").text(window.location.hostname);
	initSiteIconUpload(spaceName);

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
			html += 'This space has <a href="' + url + '">' + numTiddlers + " public tiddlers</a>";
			$("#info").html(html);
		}
	}

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

	space.members().get(function(members) {
		countTiddlers(members);
	}, function() {
		countTiddlers();
	});

	function complete(tiddler) {
		$("#siteinfo .edit").show();
		$("#siteinfo .value").data("tiddler", tiddler).
			empty().html(tiddler.render);
	}

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
						complete(tid);
					}, errback, "render=y");
				}, errback);
				$(editBtn).show();
			}).appendTo(val);
			$("<button />").text("cancel").
				click(function(ev) {
					complete(tiddler);
				}).appendTo(val);
		}).text("edit").appendTo("#siteinfo");
	}

	/*
	 * SiteInfo handling
	 */
	$("<div class='value' />").text("(Loading SiteInfo tiddler)").data("tiddler", tiddler).appendTo("#siteinfo");
	tiddler.get(
		function(tid) {
			tiddler = tid;
			$("#siteinfo .value").data("tiddler", tid).html(tid.render || tid.text);
			if($(document.body).hasClass("ts-member")) {
				siteInfoEditor(tid);
			}
		},
		function() {
			$("#siteinfo .value").text("This space has not published any information about itself.");
			if($(document.body).hasClass("ts-member")) {
				siteInfoEditor(tiddler);
			}
		},
		"render=1"
	);
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
