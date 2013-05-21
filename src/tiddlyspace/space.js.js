/*global $:false, window:false, tiddlyweb:false, document:false */
ts.init(function(ts) {

	"use strict";

	/*
	 * If we aren't in a space, do nothing
	 */
	if(!ts.currentSpace) {
		return;
	}

	var spaceName = tiddlyweb.status.space.name,
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
		$evtarget = $(ev.target),
		target = $evtarget.parent().next(),
		visible = $evtarget.hasClass("open") ? true : false;

	$(target).stop(true, true);
	if(!visible) {
		$(target).slideDown(200);
		$evtarget
			.addClass("open")
			.attr("title", label1);
	} else {
		if($(target).parents().is(":hidden")) {
			// see http://forum.jquery.com/topic/slideup-doesn-t-work-with-hidden-parent
			$(target).hide();
		} else {
			$(target).slideUp(200);
		}
		$evtarget
			.removeClass("open")
			.attr("title", label2);
	}
}

// setup hide/show sliders
$(".toggleNext").each(function(i, el) {
	$(el).addClass("open").click(toggleNext);
	toggleNext({ target: el });
});

(function($) {
	var status = tiddlyweb.status,
		spacename = status.space.name,
		pub_recipe_arr = [
			["system", ""],
			["tiddlyspace", ""],
			["system-plugins_public", ""],
			["system-info_public", ""],
			["system-images_public", ""],
			["system-theme_public", ""],
			[spacename + "_public", ""]
		],
		pri_recipe_arr = pub_recipe_arr.concat([[spacename + "_private", ""]]);

	function resetRecipes() {
		var pub_recipe = new tiddlyweb.Recipe(spacename + "_public", "/"),
			pri_recipe = new tiddlyweb.Recipe(spacename + "_private", "/");

		function callback() {}
		function errorback() {
			$.event.trigger("recipe-error");
		}
		pub_recipe.get(function(recipe, status, xhr) {
			recipe.recipe = pub_recipe_arr;
			recipe.put(callback, errorback);
		}, function(xhr, error, exc) {
		});
		pri_recipe.get(function(recipe, status, xhr) {
			recipe.recipe = pri_recipe_arr;
			recipe.put(callback, errorback);
		}, function(xhr, error, exc) {
		});
	}

	function deleteSpaceTiddlers(cb) {
		var host = tiddlyweb.status.server_host.host,
			pub_url = "/bags/" + spacename + "_public/tiddlers",
			pri_url = "/bags/" + spacename + "_private/tiddlers";

		function emptyBag(url, cb) {
			$.getJSON(url + ".json", function(data) {
				if(data && data.length > 0) {
					data.forEach(function(el, index, arr) {
						$.ajax({
							type: "DELETE",
							url: url + "/" + el.title
						}).done(function() {
							if(index + 1 === arr.length && cb) {
								cb();
							}
						});
					});
				} else if(cb) {
					cb();
				}
			});
		}

		emptyBag(pub_url);
		emptyBag(pri_url, cb);
	}

	function putTiddler(tiddler, url, cb) {
		$.ajax({
			url: url,
			type: "PUT",
			contentType: 'application/json',
			data: JSON.stringify(tiddler)
		}).done(function() {
			if(cb) {
				cb();
			}
		});
	}

	function cloneGettingStarted() {
		var url = "bags/system-info_public/tiddlers/GettingStarted.json",
			gsurl = "/bags/" + spacename + "_public/tiddlers/GettingStarted";

		$.getJSON(url, function(tiddler) {
			putTiddler(tiddler, gsurl);
		});
	}

	function createSiteInfo(cb) {
		var siurl = "/bags/" + spacename + "_public/tiddlers/SiteInfo",
			siTiddler = {
			title: "SiteInfo",
			text: "Space " + spacename,
			tags: []
		};
		putTiddler(siTiddler, siurl, cb);
	}

	function resetSpace(el) {
		resetRecipes();
		deleteSpaceTiddlers(function() {
			cloneGettingStarted();
			createSiteInfo(function() {
				$(el).addClass('resetcomplete');
				$.event.trigger('resetcomplete');
			});
		});
	};

	$(function() {
		var $resetwrap = $(".reset-confirm-wrap").hide(),
			$resetform = $resetwrap.find("form"),
			$msgArea = $resetwrap.find(".reset-message-area"),
			$resetbtn = $(".spacereset");

		// need to check if user is a member
		if(status.space.recipe.match(/_private$/)) {
			$resetbtn.on("click", function(e) {
				$resetwrap
					.show()
					.find("input")
						.focus();
				return false;
			});

			$resetwrap.find(".close-btn").on("click", function() {
				$resetform.find("input").val("");
				$resetwrap.removeClass("error").hide();
			});

			$resetform.on("submit", function(e) {
				var inputname = $(e.target).find("input").val();

				$resetwrap.removeClass("error");
				if(inputname === spacename) {
					$resetwrap.addClass("inaction");
					$msgArea.find(".performing").show();
					$( document ).on("resetcomplete", function() {
						$resetwrap.removeClass("inaction").addClass("resetcomplete");
						$msgArea
							.find("p").hide()
							.end()
							.find(".finished").show();
					});
					$( document ).on("recipe-error", function() {
						$msgArea
							.find("p").hide()
							.end()
							.find(".recipe-error-msg").show();
					});
					resetSpace( $(".spacereset") );
				} else {
					$resetwrap.addClass("error");
				}
				return false;
			});
		} else {
			$resetbtn.hide();
		}
	});
}(jQuery));

if(window !== window.top) {
	$("html").addClass("iframeMode");
	$("a").live("click", function(ev) {
		$(ev.target).attr("target", "_blank");
	});
}
